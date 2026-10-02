/**
 * @file rag.repository.ts
 * @description RAG Doküman Yönetimi ve Veri Erişim Katmanı (Repository Pattern).
 * Veritabanı sorgularını modül içinde izole eder; iş mantığının (service layer) Mongoose ODM
 * detaylarına bağımlı kalmadan temiz bir arayüzle konuşmasını sağlar.
 *
 * Mimari Roller & Standartlar:
 * - Design Pattern: Repository Pattern (SOLID - Single Responsibility & Interface Segregation).
 * - Zero-Context-Leakage: Rol bazlı erişim denetimi (`allowed_roles`) filtreleri doğrudan
 *   sorgu seviyesinde uygulanır.
 *
 * @example
 * ```typescript
 * import { ragRepository } from '#modules/rag/rag.repository.js';
 *
 * const doc = await ragRepository.create({
 *   title: 'İK Yönetmeliği',
 *   file_name: 'ik_yonetmeligi.pdf',
 *   file_path: '/uploads/rag/123.pdf',
 *   file_size: 2048,
 *   mime_type: 'application/pdf',
 *   allowed_roles: ['hr', 'manager'],
 *   uploaded_by: user._id,
 * });
 * ```
 */

import { DocumentModel, type IDocument, type DocumentProcessingStatus } from '#modules/rag/document.model.js';
import type { Types } from 'mongoose';

export interface CreateDocumentData {
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  allowed_roles?: string[];
  uploaded_by: Types.ObjectId | string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface FindDocumentsFilter {
  status?: DocumentProcessingStatus;
  search?: string;
}

export class RagRepository {
  /**
   * Yeni bir doküman üst veri kaydı oluşturur.
   *
   * @param data Doküman oluşturma parametreleri
   * @returns Kaydedilen doküman
   */
  async create(data: CreateDocumentData): Promise<IDocument> {
    return await DocumentModel.create({
      ...data,
      allowed_roles: data.allowed_roles && data.allowed_roles.length > 0 ? data.allowed_roles : ['*'],
      status: 'pending',
      chunk_count: 0,
    });
  }

  /**
   * Benzersiz ID ile tek bir doküman getirir.
   *
   * @param id Doküman MongoDB ObjectId değeri
   * @returns Doküman veya null
   */
  async findById(id: string | Types.ObjectId): Promise<IDocument | null> {
    return await DocumentModel.findById(id).lean();
  }

  /**
   * Zero-Context-Leakage: Kullanıcının sahip olduğu rollere göre yetkili olduğu dokümanları getirir.
   * Eğer kullanıcının rollerinden biri '*' ile eşleşiyorsa veya dokümanın allowed_roles listesinde
   * kullanıcının rollerinden en az biri varsa listelenir.
   *
   * @param userRoles Kullanıcının fonksiyonel rolleri listesi (örn: ['hr', 'developer'])
   * @param isSuperAdmin Superadmin kullanıcılar için rol kısıtlaması bypass edilir
   * @param filter Durum ve metin arama filtreleri
   * @param pagination Sayfalama parametreleri
   * @returns Doküman listesi ve toplam sayı
   */
  async findAuthorizedDocuments(
    userRoles: string[],
    isSuperAdmin: boolean,
    filter: FindDocumentsFilter = {},
    pagination: PaginationOptions = {}
  ): Promise<{ documents: IDocument[]; total: number }> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    // 1. Rol Bazlı Güvenlik Filtresi (Document ACL)
    if (!isSuperAdmin) {
      query.$or = [
        { allowed_roles: { $in: userRoles } },
        { allowed_roles: '*' },
      ];
    }

    // 2. Durum Filtresi
    if (filter.status) {
      query.status = filter.status;
    }

    // 3. Başlık veya Dosya Adı Arama Filtresi (Regex case-insensitive)
    if (filter.search && filter.search.trim().length > 0) {
      const searchRegex = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ title: searchRegex }, { file_name: searchRegex }],
      });
    }

    const [documents, total] = await Promise.all([
      DocumentModel.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DocumentModel.countDocuments(query),
    ]);

    return { documents, total };
  }

  /**
   * Dokümanın işleme durumunu ve ilerleme detaylarını günceller.
   *
   * @param id Doküman ID
   * @param status Yeni durum
   * @param details Parça sayısı veya hata mesajı ek bilgisi
   */
  async updateStatus(
    id: string | Types.ObjectId,
    status: DocumentProcessingStatus,
    details?: { chunk_count?: number; error_message?: string | null }
  ): Promise<IDocument | null> {
    const updatePayload: Record<string, any> = { status };

    if (details?.chunk_count !== undefined) {
      updatePayload.chunk_count = details.chunk_count;
    }

    if (details?.error_message !== undefined) {
      updatePayload.error_message = details.error_message;
    }

    return await DocumentModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { returnDocument: 'after' }
    ).lean();
  }

  /**
   * Dokümanın erişim izinlerini (Document ACL) günceller.
   *
   * @param id Doküman ID
   * @param allowedRoles Yeni izinli roller dizisi
   */
  async updateAllowedRoles(id: string | Types.ObjectId, allowedRoles: string[]): Promise<IDocument | null> {
    return await DocumentModel.findByIdAndUpdate(
      id,
      { $set: { allowed_roles: allowedRoles } },
      { returnDocument: 'after' }
    ).lean();
  }

  /**
   * Doküman kaydını veritabanından kalıcı olarak siler.
   *
   * @param id Doküman ID
   */
  async deleteById(id: string | Types.ObjectId): Promise<boolean> {
    const result = await DocumentModel.findByIdAndDelete(id);
    return !!result;
  }
}

export const ragRepository = new RagRepository();
