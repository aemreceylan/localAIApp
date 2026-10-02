/**
 * @file audit.repository.ts
 * @description Denetim izi veri erişim katmanı.
 */

import { AuditLogModel, type IAuditLog } from '#modules/audit/audit.model.js';

export class AuditRepository {
  async createLog(data: IAuditLog): Promise<IAuditLog> {
    return await AuditLogModel.create(data);
  }

  async findRecent(limit = 100): Promise<IAuditLog[]> {
    return await AuditLogModel.find().sort({ created_at: -1 }).limit(limit).lean();
  }

  async findByTarget(targetId: string, limit = 50): Promise<IAuditLog[]> {
    return await AuditLogModel.find({ target_id: targetId })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();
  }
}

export const auditRepository = new AuditRepository();
