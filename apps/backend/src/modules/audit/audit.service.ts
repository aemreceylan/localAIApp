/**
 * @file audit.service.ts
 * @description Kurumsal Güvenlik Denetim İzi (Audit Log) Servisi.
 */

import { auditRepository } from '#modules/audit/audit.repository.js';
import type { IAuditLog, AuditAction } from '#modules/audit/audit.model.js';

export interface CreateAuditLogParams {
  actor?: {
    _id?: any;
    email?: string;
    system_role?: string;
  };
  action: AuditAction | string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Kritik güvenlik işlemlerini asenkron olarak kaydeder.
   * Denetim kaydı hatası ana akışı engellemez (Fail-Safe Logging).
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await auditRepository.createLog({
        actor_id: params.actor?._id ? params.actor._id.toString() : undefined,
        actor_email: params.actor?.email,
        actor_role: params.actor?.system_role,
        action: params.action,
        target_id: params.targetId,
        target_type: params.targetType,
        details: params.details || {},
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
      });
    } catch (error) {
      console.error('[AUDIT LOG ERROR] Denetim izi kaydedilemedi:', error);
    }
  }

  async getRecentLogs(limit = 100): Promise<IAuditLog[]> {
    return await auditRepository.findRecent(limit);
  }
}

export const auditService = new AuditService();
