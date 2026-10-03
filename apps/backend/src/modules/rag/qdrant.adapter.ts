/**
 * @file qdrant.adapter.ts
 * @description Qdrant Vektör Veritabanı HTTP REST Adaptörü ve Rol Filtreli Arama Motoru.
 * Kurumsal dokümanların vektör gömmelerini (embeddings) saklar, günceller ve
 * Zero-Context-Leakage prensibine uygun olarak departman rolleriyle (`allowed_roles`)
 * filtreli semantik arama (similarity search) yürütür.
 *
 * Mimari Rol & Tasarım Deseni:
 * - Design Pattern: Adapter Pattern & Repository Integration (SOLID - Open/Closed & Dependency Inversion).
 * - Zero-Context-Leakage: Rol bazlı Qdrant payload filtreleri doğrudan vektör arama seviyesinde işletilir.
 *   Yetkisiz rollerin vektör verisine matematiksel olarak ulaşması engellenir.
 * - Minimum Dependency: Node.js native `fetch` ve `crypto.randomUUID()` kullanılır; harici hantal
 *   paket bağımlılığı yoktur.
 *
 * @example
 * ```typescript
 * import { qdrantAdapter } from '#modules/rag/qdrant.adapter.js';
 *
 * // 1. Koleksiyon hazırlığı
 * await qdrantAdapter.ensureCollection(1536);
 *
 * // 2. Vektör yükleme
 * await qdrantAdapter.upsertPoints([{
 *   id: crypto.randomUUID(),
 *   vector: [0.12, 0.45, ...],
 *   payload: {
 *     document_id: '66fa...',
 *     chunk_index: 0,
 *     text: 'Kurumsal izin yönetmeliği...',
 *     allowed_roles: ['hr', 'manager'],
 *     metadata: { title: 'İK Yönetmeliği', page_number: 1 }
 *   }
 * }]);
 *
 * // 3. Zero-Context-Leakage rol filtreli arama
 * const results = await qdrantAdapter.searchWithRoleFilter(
 *   queryVector,
 *   ['hr'], // kullanıcının rolleri
 *   false,  // isSuperAdmin
 *   { limit: 5, scoreThreshold: 0.65 }
 * );
 * ```
 */

import { randomUUID } from 'node:crypto';
import { env } from '#config/env.config.js';
import { LLMProviderError } from '#shared/errors/index.js';

export const DEFAULT_QDRANT_COLLECTION = 'rag_documents_vectors';
export const DEFAULT_VECTOR_DIMENSION = 1536;

/**
 * Qdrant Point Payload formatı
 */
export interface QdrantPayload {
  document_id: string;
  chunk_index: number;
  text: string;
  allowed_roles: string[];
  metadata?: {
    title?: string;
    file_name?: string;
    page_number?: number;
    section?: string;
    [key: string]: unknown;
  };
}

/**
 * Qdrant Vektör Noktası (Point)
 */
export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: QdrantPayload;
}

/**
 * Vektör benzerlik arama sonucu
 */
export interface QdrantSearchResult {
  id: string;
  score: number;
  payload: QdrantPayload;
}

/**
 * Qdrant Adaptör Yapılandırma Seçenekleri
 */
export interface QdrantAdapterOptions {
  baseUrl?: string;
  apiKey?: string;
  collectionName?: string;
  timeoutMs?: number;
  useMemoryFallback?: boolean;
}

/**
 * Qdrant Vektör Veritabanı Adaptörü
 */
export class QdrantAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly collectionName: string;
  private readonly timeoutMs: number;
  private readonly memoryStore: Map<string, QdrantPoint> = new Map();
  private isMemoryFallbackActive = false;

  constructor(options: QdrantAdapterOptions = {}) {
    const rawUrl = options.baseUrl || env.QDRANT_URL || 'http://localhost:6333';
    this.baseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    this.apiKey = options.apiKey || env.QDRANT_API_KEY;
    this.collectionName = options.collectionName || DEFAULT_QDRANT_COLLECTION;
    this.timeoutMs = options.timeoutMs || 5000;
    this.isMemoryFallbackActive = options.useMemoryFallback || false;
  }

  /**
   * HTTP istek başlıklarını hazırlar
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.apiKey) {
      headers['api-key'] = this.apiKey;
    }
    return headers;
  }

  /**
   * Qdrant sunucusuna güvenli HTTP isteği atar (AbortSignal.timeout ile)
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const signal = options.signal || AbortSignal.timeout(this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...(options.headers as Record<string, string>),
        },
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new LLMProviderError(
          `Qdrant API hatası [${response.status}]: ${response.statusText}`,
          { url, status: response.status, response: errorText }
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof LLMProviderError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Bilinmeyen ağ hatası';
      throw new LLMProviderError(`Qdrant sunucusuna erişilemedi (${url}): ${message}`, {
        originalError: message,
      });
    }
  }

  /**
   * Qdrant servisinin canlı ve erişilebilir olup olmadığını kontrol eder.
   */
  async isHealthy(): Promise<boolean> {
    if (this.isMemoryFallbackActive) return true;
    try {
      const url = `${this.baseUrl}/readyz`;
      const signal = AbortSignal.timeout(this.timeoutMs);
      const res = await fetch(url, { headers: this.getHeaders(), signal });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Test veya yerel geliştirme için In-Memory fallback modunu açar/kapatır.
   */
  setMemoryFallback(active: boolean): void {
    this.isMemoryFallbackActive = active;
  }

  /**
   * Vektör koleksiyonunun varlığını denetler; yoksa Cosine mesafesi ile oluşturur.
   *
   * @param dimension Embedding vektör boyutu (varsayılan: 1536)
   */
  async ensureCollection(dimension = DEFAULT_VECTOR_DIMENSION): Promise<boolean> {
    if (this.isMemoryFallbackActive) return true;

    try {
      await this.request(`/collections/${this.collectionName}`);
      return true;
    } catch {
      try {
        await this.request(`/collections/${this.collectionName}`, {
          method: 'PUT',
          body: JSON.stringify({
            vectors: {
              size: dimension,
              distance: 'Cosine',
            },
          }),
        });
        return true;
      } catch (createErr) {
        console.warn('[Qdrant] Koleksiyon oluşturulamadı, bellek içi fallback moduna geçiliyor:', createErr);
        this.isMemoryFallbackActive = true;
        return false;
      }
    }
  }

  /**
   * Vektör parçalarını (points) Qdrant koleksiyonuna toplu olarak kaydeder (Upsert).
   *
   * @param points Kaydedilecek Qdrant noktaları dizisi
   */
  async upsertPoints(points: QdrantPoint[]): Promise<boolean> {
    if (!points || points.length === 0) return true;

    if (this.isMemoryFallbackActive) {
      for (const p of points) {
        const id = p.id || randomUUID();
        this.memoryStore.set(id, { ...p, id });
      }
      return true;
    }

    try {
      await this.request(`/collections/${this.collectionName}/points?wait=true`, {
        method: 'PUT',
        body: JSON.stringify({
          points: points.map((p) => ({
            id: p.id || randomUUID(),
            vector: p.vector,
            payload: p.payload,
          })),
        }),
      });
      return true;
    } catch (err) {
      console.warn('[Qdrant] Upsert hatası, bellek içine yedekleniyor:', err);
      this.isMemoryFallbackActive = true;
      for (const p of points) {
        this.memoryStore.set(p.id || randomUUID(), p);
      }
      return false;
    }
  }

  /**
   * Zero-Context-Leakage: Kullanıcı rolleri enjekte edilerek benzerlik araması yapar.
   * Superadmin haricindeki tüm sorgularda `allowed_roles` filtrelemesi zorunludur.
   *
   * @param vector Kullanıcı sorusunun embedding vektörü
   * @param userRoles Kullanıcının fonksiyonel departman rolleri (örn: ['hr', 'finance'])
   * @param isSuperAdmin Superadmin sorgularında rol filtresi bypass edilir
   * @param options Arama limiti ve benzerlik eşiği (scoreThreshold)
   */
  async searchWithRoleFilter(
    vector: number[],
    userRoles: string[],
    isSuperAdmin: boolean,
    options: { limit?: number; scoreThreshold?: number } = {}
  ): Promise<QdrantSearchResult[]> {
    const limit = Math.min(20, Math.max(1, options.limit || 5));
    const scoreThreshold = options.scoreThreshold ?? 0.5;

    // Zero-Context-Leakage Filtresi
    let filter: Record<string, any> | undefined;
    if (!isSuperAdmin) {
      filter = {
        should: [
          { key: 'allowed_roles', match: { any: userRoles } },
          { key: 'allowed_roles', match: { value: '*' } },
        ],
      };
    }

    if (this.isMemoryFallbackActive) {
      return this.searchInMemory(vector, userRoles, isSuperAdmin, limit, scoreThreshold);
    }

    try {
      const response = await this.request<{
        result: Array<{
          id: string;
          score: number;
          payload: QdrantPayload;
        }>;
      }>(`/collections/${this.collectionName}/points/search`, {
        method: 'POST',
        body: JSON.stringify({
          vector,
          limit,
          score_threshold: scoreThreshold,
          with_payload: true,
          filter,
        }),
      });

      return (response.result || []).map((r) => ({
        id: String(r.id),
        score: r.score,
        payload: r.payload,
      }));
    } catch (err) {
      console.warn('[Qdrant] Vektör arama hatası, memory fallback deneniyor:', err);
      return this.searchInMemory(vector, userRoles, isSuperAdmin, limit, scoreThreshold);
    }
  }

  /**
   * Doküman silindiğinde o dokümana ait tüm vektör parçalarını temizler.
   *
   * @param documentId Kaynak dokümanın MongoDB ID değeri
   */
  async deletePointsByDocumentId(documentId: string): Promise<boolean> {
    if (this.isMemoryFallbackActive) {
      for (const [id, point] of this.memoryStore.entries()) {
        if (point.payload.document_id === documentId) {
          this.memoryStore.delete(id);
        }
      }
      return true;
    }

    try {
      await this.request(`/collections/${this.collectionName}/points/delete?wait=true`, {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            must: [{ key: 'document_id', match: { value: documentId } }],
          },
        }),
      });
      return true;
    } catch (err) {
      console.warn('[Qdrant] Vektör silme hatası:', err);
      return false;
    }
  }

  /**
   * Dokümanın erişim izinleri (Document ACL) güncellendiğinde,
   * Qdrant'taki tüm vektör parçalarının payload'ındaki `allowed_roles` dizisini senkronize eder.
   *
   * @param documentId Doküman kimliği
   * @param allowedRoles Güncel izinli roller
   */
  async updatePointsRoles(documentId: string, allowedRoles: string[]): Promise<boolean> {
    if (this.isMemoryFallbackActive) {
      for (const point of this.memoryStore.values()) {
        if (point.payload.document_id === documentId) {
          point.payload.allowed_roles = allowedRoles;
        }
      }
      return true;
    }

    try {
      await this.request(`/collections/${this.collectionName}/points/payload?wait=true`, {
        method: 'POST',
        body: JSON.stringify({
          payload: { allowed_roles: allowedRoles },
          filter: {
            must: [{ key: 'document_id', match: { value: documentId } }],
          },
        }),
      });
      return true;
    } catch (err) {
      console.warn('[Qdrant] Payload rol güncelleme hatası:', err);
      return false;
    }
  }

  /**
   * Bellek İçi Cosine Benzerlik Arama Fonksiyonu (Fallback & Unit Test)
   */
  private searchInMemory(
    vector: number[],
    userRoles: string[],
    isSuperAdmin: boolean,
    limit: number,
    scoreThreshold: number
  ): QdrantSearchResult[] {
    const results: QdrantSearchResult[] = [];

    for (const [id, point] of this.memoryStore.entries()) {
      // 1. Rol filtresi (Zero-Context-Leakage)
      if (!isSuperAdmin) {
        const roles = point.payload.allowed_roles;
        const hasAccess = roles.includes('*') || userRoles.some((r) => roles.includes(r));
        if (!hasAccess) continue;
      }

      // 2. Cosine similarity hesapla
      const score = this.calculateCosineSimilarity(vector, point.vector);
      if (score >= scoreThreshold) {
        results.push({
          id,
          score,
          payload: point.payload,
        });
      }
    }

    // Skora göre azalan sırala ve limiti uygula
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * İki vektör arasındaki Cosine benzerlik katsayısını hesaplar
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const valA = a[i]!;
      const valB = b[i]!;
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Test temizliği için bellek deposunu boşaltır
   */
  clearMemoryStore(): void {
    this.memoryStore.clear();
  }
}

export const qdrantAdapter = new QdrantAdapter();
