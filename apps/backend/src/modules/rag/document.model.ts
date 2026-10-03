/**
 * @file document.model.ts
 * @description RAG (Retrieval-Augmented Generation) Doküman Mongoose Veri Modeli ve Şeması.
 * Kurumsal bilgi bankasına yüklenen dokümanların üst verilerini (metadata), işleme durumunu
 * ve Rol Bazlı Erişim İzni (Document ACL - `allowed_roles`) yapılandırmasını saklar.
 *
 * Mimari Rol:
 * - Domain Entity & Data Layer (MongoDB Mongoose ODM)
 * - Zero-Context-Leakage veri izolasyonunun birincil kayıt noktası.
 *
 * @example
 * ```typescript
 * import { DocumentModel } from '#modules/rag/document.model.js';
 *
 * const doc = await DocumentModel.create({
 *   title: '2026 Kurumsal Veri Güvenliği Politikası',
 *   file_name: 'veri_guvenligi.pdf',
 *   file_path: 'uploads/rag/1727878900-veri_guvenligi.pdf',
 *   file_size: 1048576,
 *   mime_type: 'application/pdf',
 *   allowed_roles: ['admin', 'security_officer'],
 *   uploaded_by: user._id,
 * });
 * ```
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

/**
 * Doküman işleme yaşam döngüsü durumları (BullMQ Pipeline Lifecycle)
 */
export type DocumentProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * MongoDB Document Arayüzü
 */
export interface IDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: DocumentProcessingStatus;
  chunk_count: number;
  allowed_roles: string[];
  uploaded_by: Types.ObjectId;
  error_message?: string | null;
  created_at: Date;
  updated_at: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: [true, 'Doküman başlığı zorunludur.'],
      trim: true,
      maxlength: [200, 'Doküman başlığı 200 karakterden uzun olamaz.'],
    },
    file_name: {
      type: String,
      required: [true, 'Orijinal dosya adı zorunludur.'],
      trim: true,
    },
    file_path: {
      type: String,
      required: [true, 'Dosya depolama yolu zorunludur.'],
      trim: true,
    },
    file_size: {
      type: Number,
      required: [true, 'Dosya boyutu zorunludur.'],
      min: [1, 'Dosya boyutu en az 1 bayt olmalıdır.'],
    },
    mime_type: {
      type: String,
      required: [true, 'MIME türü zorunludur.'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    chunk_count: {
      type: Number,
      default: 0,
      min: [0, 'Parça sayısı negatif olamaz.'],
    },
    allowed_roles: {
      type: [String],
      default: ['*'], // Varsayılan olarak tüm kurumsal rollere açık
      index: true,
    },
    uploaded_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Yükleyen kullanıcı referansı zorunludur.'],
      index: true,
    },
    error_message: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Çoklu alan ve sorgu indeksleri (Performans & Güvenlik)
documentSchema.index({ status: 1, created_at: -1 });
documentSchema.index({ allowed_roles: 1, status: 1 });
documentSchema.index({ allowed_roles: 1, created_at: -1 });
documentSchema.index({ uploaded_by: 1, created_at: -1 });

export const DocumentModel: Model<IDocument> =
  mongoose.models.Document || mongoose.model<IDocument>('Document', documentSchema);
