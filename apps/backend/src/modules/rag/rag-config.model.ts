/**
 * @file rag-config.model.ts
 * @description RAG ve BullMQ Dinamik Yapılandırma MongoDB Mongoose Modeli.
 * Admin kullanıcıların sistem çalışma parametrelerini (worker concurrency, retry,
 * chunk size, chunk overlap) arayüzden çalışma anında (runtime hot-reload)
 * düzenlemesini sağlar.
 *
 * Mimari Rol:
 * - Runtime Dynamic Configuration: Sunucu yeniden başlatılmasına gerek kalmadan
 *   kuyruk, worker ve chunker ayarlarını veritabanında saklar ve senkronize eder.
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IRagConfig extends Document {
  key: string;
  concurrency: number;
  attempts: number;
  backoff_delay_ms: number;
  chunk_size: number;
  chunk_overlap: number;
  remove_on_complete_count: number;
  remove_on_fail_count: number;
  updated_at: Date;
}

export const DEFAULT_RAG_CONFIG = {
  key: 'rag_ingestion_settings',
  concurrency: 2,
  attempts: 3,
  backoff_delay_ms: 2000,
  chunk_size: 1000,
  chunk_overlap: 200,
  remove_on_complete_count: 1000,
  remove_on_fail_count: 5000,
} as const;

const ragConfigSchema = new Schema<IRagConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: DEFAULT_RAG_CONFIG.key,
      trim: true,
    },
    concurrency: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: DEFAULT_RAG_CONFIG.concurrency,
    },
    attempts: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: DEFAULT_RAG_CONFIG.attempts,
    },
    backoff_delay_ms: {
      type: Number,
      required: true,
      min: 500,
      max: 60000,
      default: DEFAULT_RAG_CONFIG.backoff_delay_ms,
    },
    chunk_size: {
      type: Number,
      required: true,
      min: 100,
      max: 8000,
      default: DEFAULT_RAG_CONFIG.chunk_size,
    },
    chunk_overlap: {
      type: Number,
      required: true,
      min: 0,
      max: 2000,
      default: DEFAULT_RAG_CONFIG.chunk_overlap,
    },
    remove_on_complete_count: {
      type: Number,
      required: true,
      min: 10,
      max: 10000,
      default: DEFAULT_RAG_CONFIG.remove_on_complete_count,
    },
    remove_on_fail_count: {
      type: Number,
      required: true,
      min: 10,
      max: 50000,
      default: DEFAULT_RAG_CONFIG.remove_on_fail_count,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
    collection: 'rag_settings',
  }
);

export const RagConfigModel: Model<IRagConfig> =
  mongoose.models.RagConfig || mongoose.model<IRagConfig>('RagConfig', ragConfigSchema);
