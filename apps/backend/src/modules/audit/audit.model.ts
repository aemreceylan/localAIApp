/**
 * @file audit.model.ts
 * @description Kurumsal Denetim İzi (Audit Log) Veri Modeli.
 * Yetki değişiklikleri, ban işlemleri, superadmin devri ve belge erişim güncellemeleri
 * gibi kritik güvenlik aksiyonlarını değişmez (immutable) olarak kaydeder.
 */

import mongoose, { Schema, type Model } from 'mongoose';

export type AuditAction =
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'USER_REGISTERED'
  | 'USER_APPROVED'
  | 'USER_REJECTED'
  | 'INVITATION_CREATED'
  | 'INVITATION_USED'
  | 'ADMIN_ASSIGNED'
  | 'ADMIN_REVOKED'
  | 'ROLES_ASSIGNED'
  | 'SUPERADMIN_TRANSFERRED'
  | 'DOCUMENT_ROLES_UPDATED'
  | 'PROMPT_ROLES_UPDATED'
  | 'MODEL_ROLES_UPDATED'
  | 'LOGIN_FAILED_BANNED';

export interface IAuditLog {
  actor_id?: mongoose.Types.ObjectId | string | undefined;
  actor_email?: string | undefined;
  actor_role?: string | undefined;
  action: AuditAction | string;
  target_id?: string | undefined;
  target_type?: string | undefined;
  details?: Record<string, any> | undefined;
  ip_address?: string | undefined;
  user_agent?: string | undefined;
  created_at?: Date | undefined;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor_id: {
      type: Schema.Types.Mixed,
      index: true,
    },
    actor_email: {
      type: String,
      trim: true,
      index: true,
    },
    actor_role: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Denetim aksiyon tipi zorunludur.'],
      index: true,
    },
    target_id: {
      type: String,
      index: true,
    },
    target_type: {
      type: String,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip_address: {
      type: String,
      trim: true,
    },
    user_agent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'audit_logs',
  }
);

// Güvenlik denetimleri için bileşik indeks
auditLogSchema.index({ action: 1, created_at: -1 });

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
