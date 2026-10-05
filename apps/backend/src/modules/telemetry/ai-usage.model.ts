/**
 * @file ai-usage.model.ts
 * @description LLM istek, cevap ve kaynak tüketim metrikleri (Token, TTFT, gecikme) Mongoose Şeması.
 * 90 günlük TTL (Time-To-Live) indeksi ile eski loglar otomatik temizlenir.
 */

import mongoose, { Schema, type Types } from 'mongoose';

export interface IAiUsageLog {
  user_id?: Types.ObjectId;
  conversation_id?: Types.ObjectId;
  model: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  ttft_ms?: number;
  status: 'success' | 'error';
  error_message?: string;
  created_at: Date;
}

const AiUsageLogSchema = new Schema<IAiUsageLog>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: false,
      index: true,
    },
    model: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      index: true,
    },
    prompt_tokens: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    completion_tokens: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    total_tokens: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    duration_ms: {
      type: Number,
      required: true,
      min: 0,
    },
    ttft_ms: {
      type: Number,
      required: false,
      min: 0,
    },
    status: {
      type: String,
      enum: ['success', 'error'],
      required: true,
      default: 'success',
      index: true,
    },
    error_message: {
      type: String,
      required: false,
      maxlength: 1000,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// 90 Günlük TTL İndeksi (7.776.000 saniye sonra MongoDB arka plan göreviyle silinir)
AiUsageLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 });
// Analitik ve istatistik sorguları için bileşik indeks
AiUsageLogSchema.index({ model: 1, created_at: -1 });
AiUsageLogSchema.index({ user_id: 1, created_at: -1 });

export const AiUsageLogModel = mongoose.model<IAiUsageLog>('AiUsageLog', AiUsageLogSchema);
