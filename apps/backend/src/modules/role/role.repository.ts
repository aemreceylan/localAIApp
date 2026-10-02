/**
 * @file role.repository.ts
 * @description Kurumsal Rol ve Yetki veri erişim katmanı.
 */

import { RoleModel, type IRole } from '#modules/role/role.model.js';
import type { RoleArchetype } from '#modules/role/role.types.js';

export class RoleRepository {
  async findBySlug(slug: string): Promise<IRole | null> {
    return await RoleModel.findOne({ slug: slug.toLowerCase() }).lean();
  }

  async findBySlugs(slugs: string[]): Promise<IRole[]> {
    if (!slugs || slugs.length === 0) return [];
    const normalized = slugs.map((s) => s.toLowerCase());
    return await RoleModel.find({ slug: { $in: normalized } }).lean();
  }

  async findDefaultRole(): Promise<IRole | null> {
    return await RoleModel.findOne({ is_default: true }).lean();
  }

  async findAll(): Promise<IRole[]> {
    return await RoleModel.find().sort({ is_system: -1, is_default: -1, name: 1 }).lean();
  }

  async createRole(data: {
    slug: string;
    name: string;
    description?: string;
    base_archetype: RoleArchetype;
    permissions?: string[];
    is_default?: boolean;
    is_system?: boolean;
  }): Promise<IRole> {
    return await RoleModel.create({
      ...data,
      slug: data.slug.toLowerCase().trim(),
    });
  }

  async updatePermissions(slug: string, permissions: string[]): Promise<IRole | null> {
    return await RoleModel.findOneAndUpdate(
      { slug: slug.toLowerCase() },
      { $set: { permissions } },
      { returnDocument: 'after' }
    ).lean();
  }

  async setDefaultRole(slug: string): Promise<IRole | null> {
    // 1. Önceki tüm varsayılan işaretlerini kaldır
    await RoleModel.updateMany({ is_default: true }, { $set: { is_default: false } });

    // 2. Yeni hedef rolü varsayılan olarak işaretle
    return await RoleModel.findOneAndUpdate(
      { slug: slug.toLowerCase() },
      { $set: { is_default: true } },
      { returnDocument: 'after' }
    ).lean();
  }

  async deleteRole(slug: string): Promise<boolean> {
    const result = await RoleModel.deleteOne({
      slug: slug.toLowerCase(),
      is_system: false, // Sistem rolleri asla silinemez
    });
    return (result.deletedCount ?? 0) > 0;
  }
}

export const roleRepository = new RoleRepository();
