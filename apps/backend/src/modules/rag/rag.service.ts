/**
 * @file rag.service.ts
 * @description RAG Bilgi Bankası ve Vektör Arama İş Mantığı Servisi.
 * Dosya yükleme orkestrasyonu, BullMQ iş kuyruğu koordinasyonu, Zero-Context-Leakage
 * rol filtreli semantik arama ve MongoDB-Qdrant senkronizasyonunu yürütür.
 *
 * Mimari Roller:
 * - Domain Service (Orchestrator): Repository, Queue, Qdrant ve Embedding servislerini bağlar.
 * - Zero-Context-Leakage Güvenliği: Sorgu ve erişim aşamalarında Document ACL doğrulaması yapar.
 */

import fs from 'node:fs/promises';
import type { Types } from 'mongoose';
import { NotFoundError, ForbiddenError, ValidationError } from '#shared/errors/index.js';
import type { IUser } from '#modules/auth/user.model.js';
import { ragRepository } from './rag.repository.js';
import { ragQueue } from './rag.queue.js';
import { qdrantAdapter, type QdrantSearchResult } from './qdrant.adapter.js';
import { embeddingService } from './embedding.service.js';
import type {
  UploadDocumentMetadataInput,
  ListDocumentsQueryInput,
  RagQueryInput,
} from './rag.dto.js';
import { DocumentModel, type IDocument, type DocumentProcessingStatus } from './document.model.js';

export interface RagCitation {
  documentId: string;
  documentTitle?: string;
  chunkIndex: number;
  text: string;
  score: number;
  pageNumber?: number;
  metadata?: Record<string, unknown>;
}

export interface RagQueryResult {
  query: string;
  totalMatches: number;
  citations: RagCitation[];
}

export class RagService {
  /**
   * Yeni bir doküman yükler, MongoDB'de 'pending' kaydı açar ve BullMQ kuyruğuna iş ekler.
   *
   * @param file Multer tarafından yüklenen dosya
   * @param metadata Yükleme üst verileri (title, allowed_roles)
   * @param user Yükleyen kullanıcı
   * @returns Oluşturulan doküman kaydı
   */
  async uploadDocument(
    file: Express.Multer.File | undefined,
    metadata: UploadDocumentMetadataInput,
    user: IUser & { _id: Types.ObjectId }
  ): Promise<IDocument> {
    if (!file) {
      throw new ValidationError('Lütfen yüklenecek bir dosya seçin.');
    }

    const title = metadata.title?.trim() || file.originalname;
    const allowedRoles = metadata.allowed_roles && metadata.allowed_roles.length > 0
      ? metadata.allowed_roles
      : ['*'];

    // 1. MongoDB'de doküman kaydını oluştur
    const document = await ragRepository.create({
      title,
      file_name: file.originalname,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      allowed_roles: allowedRoles,
      uploaded_by: user._id,
    });

    const documentId = document._id.toString();

    // 2. BullMQ asenkron kuyruğuna doküman indeksleme işini ekle
    await ragQueue.addIngestionJob({
      documentId,
      filePath: file.path,
      filename: file.originalname,
      mimeType: file.mimetype,
      allowedRoles,
    });

    return document;
  }

  /**
   * Kullanıcının rollerine göre yetkili olduğu dokümanları sayfalı ve filtreli listeler.
   */
  async listDocuments(
    filter: ListDocumentsQueryInput,
    user: IUser
  ): Promise<{ documents: IDocument[]; total: number; page: number; limit: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const isSuperAdmin = user.system_role === 'superadmin';
    const userRoles = user.roles || [];

    const repoFilter: { status?: DocumentProcessingStatus; search?: string } = {};
    if (filter.status !== undefined) repoFilter.status = filter.status;
    if (filter.search !== undefined) repoFilter.search = filter.search;

    const { documents, total } = await ragRepository.findAuthorizedDocuments(
      userRoles,
      isSuperAdmin,
      repoFilter,
      { page, limit }
    );

    return {
      documents,
      total,
      page,
      limit,
    };
  }

  /**
   * ID'ye göre tekil doküman detayını getirir ve rol yetkisini doğrular.
   */
  async getDocumentById(id: string, user: IUser): Promise<IDocument> {
    const document = await ragRepository.findById(id);
    if (!document) {
      throw new NotFoundError(`Doküman bulunamadı: '${id}'`);
    }

    // Yetki kontrolü (Zero-Context-Leakage)
    if (!this.isUserAuthorizedForDocument(user, document)) {
      throw new ForbiddenError('Bu dokümana erişim yetkiniz bulunmamaktadır.');
    }

    return document;
  }

  /**
   * Dokümanın erişim rollerini (Document ACL) MongoDB ve Qdrant'ta günceller.
   */
  async updateDocumentRoles(
    id: string,
    allowedRoles: string[],
    user: IUser
  ): Promise<IDocument> {
    const document = await this.getDocumentById(id, user);

    // 1. MongoDB'de rolleri güncelle
    const updated = await ragRepository.updateAllowedRoles(document._id, allowedRoles);
    if (!updated) {
      throw new NotFoundError(`Güncellenecek doküman bulunamadı: '${id}'`);
    }

    // 2. Qdrant vektör noktalarının allowed_roles payload'ını güncelle
    await qdrantAdapter.updatePointsRoles(id, allowedRoles);

    return updated;
  }

  /**
   * Dokümanı MongoDB'den ve Qdrant vektör veritabanından tamamen siler.
   */
  async deleteDocument(id: string, user: IUser): Promise<{ success: boolean; id: string }> {
    const document = await this.getDocumentById(id, user);

    // 1. MongoDB'den sil
    await ragRepository.deleteById(document._id);

    // 2. Qdrant'taki ilişkili tüm vektör parçacıklarını sil
    await qdrantAdapter.deletePointsByDocumentId(id);

    // 3. Varsa diskteki orijinal dosyayı temizle
    if (document.file_path) {
      await fs.unlink(document.file_path).catch(() => {});
    }

    return { success: true, id };
  }

  /**
   * Zero-Context-Leakage prensibiyle kullanıcı rollerine göre filtrelenmiş semantik RAG araması yapar.
   */
  async queryKnowledge(
    queryInput: RagQueryInput,
    user: IUser
  ): Promise<RagQueryResult> {
    const { query, limit = 5, score_threshold = 0.5, document_ids } = queryInput;

    // 1. Kullanıcı arama metninden embedding vektörü üret
    const queryVector = await embeddingService.generateQueryEmbedding(query);

    // 2. Superadmin kontrolü
    const isSuperAdmin = user.system_role === 'superadmin';
    const userRoles = user.roles || [];

    // 3. Qdrant'ta rol filtreli ve opsiyonel doküman filtreli benzerlik araması yap
    const searchResults: QdrantSearchResult[] = await qdrantAdapter.searchWithRoleFilter(
      queryVector,
      userRoles,
      isSuperAdmin,
      {
        limit,
        scoreThreshold: score_threshold,
        ...(document_ids && document_ids.length > 0 ? { documentIds: document_ids } : {}),
      }
    );

    // 4. Eşleşen doküman başlıklarını MongoDB'den toplu olarak çek
    const uniqueDocIds = [...new Set(searchResults.map((r) => r.payload.document_id))];
    const docTitlesMap = new Map<string, string>();
    if (uniqueDocIds.length > 0) {
      try {
        const docs = await DocumentModel.find({ _id: { $in: uniqueDocIds } }, { title: 1 }).lean();
        for (const doc of docs) {
          docTitlesMap.set(doc._id.toString(), doc.title);
        }
      } catch {
        // DB sorgusu başarısız olsa dahi citation akışı kesilmez
      }
    }

    // 5. Sonuçları alıntı (citation) formatına dönüştür
    const citations: RagCitation[] = searchResults.map((res) => {
      const pageNumber = typeof res.payload.metadata?.['page_number'] === 'number'
        ? (res.payload.metadata['page_number'] as number)
        : undefined;

      const citation: RagCitation = {
        documentId: res.payload.document_id,
        chunkIndex: res.payload.chunk_index,
        text: res.payload.text,
        score: res.score,
      };

      const docTitle = docTitlesMap.get(res.payload.document_id);
      if (docTitle) {
        citation.documentTitle = docTitle;
      }

      if (pageNumber !== undefined) {
        citation.pageNumber = pageNumber;
      }
      if (res.payload.metadata) {
        citation.metadata = res.payload.metadata;
      }

      return citation;
    });

    return {
      query,
      totalMatches: citations.length,
      citations,
    };
  }

  /**
   * Kullanıcının dokümana erişim hakkı olup olmadığını doğrular (Document ACL).
   */
  private isUserAuthorizedForDocument(user: IUser, document: IDocument): boolean {
    if (user.system_role === 'superadmin') {
      return true;
    }

    const docRoles = document.allowed_roles || [];
    if (docRoles.includes('*')) {
      return true;
    }

    const userRoles = new Set(user.roles || []);
    return docRoles.some((role) => userRoles.has(role));
  }
}

export const ragService = new RagService();
