/**
 * @file embedding.service.ts
 * @description Vercel AI SDK Destekli Vektör Embedding Üretim Servisi.
 * Metin parçalarını (chunks) ve arama sorgularını Vercel AI SDK (`embed` / `embedMany`)
 * ve yerel Ollama embedding sağlayıcısı üzerinden yüksek boyutlu vektörlere dönüştürür.
 *
 * Mimari Roller:
 * - Vercel AI SDK Standardı: `embed` ve `embedMany` ile model sağlayıcısından bağımsız soyutlama.
 * - Batch Processing: Büyük dokümanlarda RAM ve model yükünü dengelemek için toplu işleme (`batchSize: 16`).
 * - Resilience & Fallback: Ollama sunucusu henüz hazır olmadığında veya test ortamlarında
 *   kesintisiz çalışabilirlik için deterministik vektör üretimi fallback mekanizması.
 *
 * @example
 * ```typescript
 * import { embeddingService } from '#modules/rag/embedding.service.js';
 *
 * // 1. Kullanıcı sorgusu için embedding üret
 * const queryVector = await embeddingService.generateQueryEmbedding('Yıllık izin hakları');
 *
 * // 2. Doküman parçaları için Qdrant Point'leri üret
 * const points = await embeddingService.generateChunkEmbeddings(
 *   'doc_123',
 *   chunks,
 *   ['hr', 'manager']
 * );
 * ```
 */

import { embed, embedMany, type EmbeddingModel } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { env } from '#config/env.config.js';
import type { DocumentChunk } from './chunker.js';
import type { QdrantPoint } from './qdrant.adapter.js';

export const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';
export const DEFAULT_EMBEDDING_DIMENSION = 1536;

export class EmbeddingService {
  private readonly ollamaProvider;
  private readonly defaultModel: string;
  private isFallbackMode = false;

  constructor(options: { defaultModel?: string; useFallback?: boolean } = {}) {
    this.defaultModel = options.defaultModel || DEFAULT_EMBEDDING_MODEL;
    this.isFallbackMode = options.useFallback || false;
    this.ollamaProvider = createOllama({
      baseURL: env.OLLAMA_BASE_URL,
    });
  }

  /**
   * Testler veya offline ortamlar için fallback modunu etkinleştirir.
   */
  setFallbackMode(enabled: boolean): void {
    this.isFallbackMode = enabled;
  }

  /**
   * Vercel AI SDK Embedding Model referansını döndürür.
   */
  private getEmbeddingModel(modelName?: string): EmbeddingModel<string> {
    const targetModel = modelName || this.defaultModel;
    return this.ollamaProvider.textEmbeddingModel(targetModel);
  }

  /**
   * Tek bir arama sorgusu için embedding vektörü üretir.
   *
   * @param query Kullanıcı arama sorgusu metni
   * @param modelName Kullanılacak embedding model adı (opsiyonel)
   * @returns Vektör dizisi (number[])
   */
  async generateQueryEmbedding(query: string, modelName?: string): Promise<number[]> {
    const cleanQuery = query.trim();
    if (cleanQuery.length === 0) {
      return new Array(DEFAULT_EMBEDDING_DIMENSION).fill(0);
    }

    if (this.isFallbackMode) {
      return this.generateDeterministicVector(cleanQuery, DEFAULT_EMBEDDING_DIMENSION);
    }

    try {
      const model = this.getEmbeddingModel(modelName);
      const result = await embed({
        model,
        value: cleanQuery,
      });

      return result.embedding;
    } catch (err) {
      console.warn('[EmbeddingService] Model embedding çağrısı başarısız, fallback vektöre geçiliyor:', err);
      this.isFallbackMode = true;
      return this.generateDeterministicVector(cleanQuery, DEFAULT_EMBEDDING_DIMENSION);
    }
  }

  /**
   * Doküman parçalarını Vercel AI SDK `embedMany` ile toplu olarak vektörleştirir
   * ve Qdrant için hazır `QdrantPoint` nesnelerine dönüştürür.
   *
   * @param documentId Kaynak dokümanın MongoDB ID'si
   * @param chunks Parçalanmış doküman parçacıkları
   * @param allowedRoles Dokümanın erişim izinleri (Document ACL)
   * @param modelName Kullanılacak embedding model adı
   * @returns Qdrant'a yüklenmeye hazır nokta (Point) dizisi
   */
  async generateChunkEmbeddings(
    documentId: string,
    chunks: DocumentChunk[],
    allowedRoles: string[],
    modelName?: string
  ): Promise<QdrantPoint[]> {
    if (!chunks || chunks.length === 0) return [];

    const batchSize = 16;
    const points: QdrantPoint[] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      const batchTexts = batchChunks.map((c) => c.text);
      const batchVectors = await this.resolveBatchVectors(batchTexts, modelName);

      for (let j = 0; j < batchChunks.length; j++) {
        const chunk = batchChunks[j]!;
        const vector = batchVectors[j]!;
        points.push(this.buildQdrantPoint(documentId, chunk, vector, allowedRoles));
      }
    }

    return points;
  }

  /**
   * Bir metin grubu için embedding vektörlerini üretir (Vercel AI SDK veya Fallback).
   */
  private async resolveBatchVectors(batchTexts: string[], modelName?: string): Promise<number[][]> {
    if (this.isFallbackMode) {
      return batchTexts.map((text) =>
        this.generateDeterministicVector(text, DEFAULT_EMBEDDING_DIMENSION)
      );
    }

    try {
      const model = this.getEmbeddingModel(modelName);
      const { embeddings } = await embedMany({
        model,
        values: batchTexts,
      });
      return embeddings;
    } catch (err) {
      console.warn('[EmbeddingService] embedMany çağrısı başarısız, fallback vektöre geçiliyor:', err);
      this.isFallbackMode = true;
      return batchTexts.map((text) =>
        this.generateDeterministicVector(text, DEFAULT_EMBEDDING_DIMENSION)
      );
    }
  }

  /**
   * Bir doküman parçasını ve vektörünü Qdrant Point formatına dönüştürür.
   */
  private buildQdrantPoint(
    documentId: string,
    chunk: DocumentChunk,
    vector: number[],
    allowedRoles: string[]
  ): QdrantPoint {
    const metadata: Record<string, unknown> = chunk.metadata
      ? { ...chunk.metadata, character_count: chunk.characterCount }
      : { character_count: chunk.characterCount };

    if (chunk.pageNumber !== undefined) {
      metadata.page_number = chunk.pageNumber;
    }

    return {
      id: chunk.id,
      vector,
      payload: {
        document_id: documentId,
        chunk_index: chunk.chunkIndex,
        text: chunk.text,
        allowed_roles: allowedRoles,
        metadata,
      },
    };
  }

  /**
   * Test ve offline durumlar için verilen metinden deterministik, normalize bir birim vektör üretir.
   */
  private generateDeterministicVector(text: string, dimension: number): number[] {
    const vector = new Array<number>(dimension).fill(0);
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i) ?? 0;
      hash = Math.trunc((hash << 5) - hash + codePoint);
    }

    // Basit trigonometrik dağılım ile float vektör üret
    for (let i = 0; i < dimension; i++) {
      vector[i] = Math.sin((hash + i) * 0.1);
    }

    // Vektörü birim uzunluğa normalize et (Cosine mesafesi için norm = 1)
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return vector;

    return vector.map((val) => val / norm);
  }
}

export const embeddingService = new EmbeddingService();
