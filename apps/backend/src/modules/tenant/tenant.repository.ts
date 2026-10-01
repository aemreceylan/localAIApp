/**
 * @file tenant.repository.ts
 * @description Kiracı (Tenant) veri erişim katmanı.
 */

import { TenantModel } from '#modules/tenant/tenant.model.js';

export class TenantRepository {
  async findBySlug(slug: string) {
    return await TenantModel.findOne({ slug });
  }

  async findById(id: string) {
    return await TenantModel.findById(id);
  }

  async createTenant(data: { name: string; slug: string; status?: 'active' | 'suspended' | 'pending' }) {
    return await TenantModel.create({
      name: data.name,
      slug: data.slug.toLowerCase().trim(),
      status: data.status || 'active',
    });
  }

  /**
   * İlk kurulumda varsayılan kurum yoksa oluşturur, varsa döner.
   */
  async findOrCreateDefaultTenant(name = 'NexusAI Kurumsal') {
    const slug = 'default-tenant';
    const existing = await this.findBySlug(slug);
    if (existing) {
      return existing;
    }
    return await this.createTenant({
      name,
      slug,
      status: 'active',
    });
  }
}

export const tenantRepository = new TenantRepository();
