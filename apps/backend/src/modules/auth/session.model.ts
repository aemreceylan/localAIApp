/**
 * @file session.model.ts
 * @description Opaque Bearer Token Oturum Veri Modeli.
 * Veritabanında ham token değil, SHA-256 hash saklanır.
 * MongoDB TTL indeksi sayesinde süresi dolan oturumlar otomatik temizlenir.
 */

import mongoose, { Schema, type Model } from 'mongoose';

export interface ISession {
  token_hash: string;
  user_id: mongoose.Types.ObjectId | string;
  tenant_id: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  last_active_at: Date;
  created_at?: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    token_hash: {
      type: String,
      required: [true, 'Token hash zorunludur.'],
      unique: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user_id zorunludur.'],
      index: true,
    },
    tenant_id: {
      type: String,
      required: [true, 'tenant_id zorunludur.'],
      index: true,
    },
    ip_address: {
      type: String,
      trim: true,
    },
    user_agent: {
      type: String,
      trim: true,
    },
    expires_at: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL Index: expires_at tarihine ulaşıldığında oturum otomatik silinir
    },
    last_active_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'sessions',
  }
);

export const SessionModel: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', sessionSchema);
