/**
 * @file role.service.ts
 * @description Kurumsal Rol ve Yetki Yönetim Servisi.
 * Redis/Memory önbellekleme desteği ve varsayılan sistem rolleri tohumlamasını (seed) içerir.
 */

import { roleRepository } from '#modules/role/role.repository.js';
import { cacheService } from '#shared/cache/index.js';
import { PERMISSIONS } from '#modules/role/role.types.js';
import type { IRole } from '#modules/role/role.model.js';
import { ValidationError, NotFoundError } from '#shared/errors/index.js';

const ROLE_CACHE_TTL_SEC = 300; // 5 Dakika

export class RoleService {
  /**
   * Sistem ilk ayağa kalktığında temel sistem ve departman rollerini tohumlar.
   */
  async initDefaultRoles(): Promise<void> {
    const defaultRoles: Array<{
      slug: string;
      name: string;
      description: string;
      permissions: string[];
      is_system: boolean;
    }> = [
      {
        slug: 'admin',
        name: 'Kurum Yöneticisi',
        description: 'Tüm sistem, model, prompt, RAG ve kullanıcı yönetimi yetkilerine sahiptir (Superadmin atama hariç).',
        permissions: [
          PERMISSIONS.USER_READ,
          PERMISSIONS.USER_MANAGE_ROLES,
          PERMISSIONS.USER_BAN,
          PERMISSIONS.USER_UNBAN,
          PERMISSIONS.RAG_DOCUMENT_READ,
          PERMISSIONS.RAG_DOCUMENT_UPLOAD,
          PERMISSIONS.RAG_DOCUMENT_UPDATE_ROLES,
          PERMISSIONS.RAG_DOCUMENT_DELETE,
          PERMISSIONS.PROMPT_READ,
          PERMISSIONS.PROMPT_CREATE,
          PERMISSIONS.PROMPT_MANAGE,
          PERMISSIONS.MODEL_MANAGE,
          PERMISSIONS.AUDIT_READ,
        ],
        is_system: true,
      },
      {
        slug: 'user',
        name: 'Standart Kullanıcı',
        description: 'Genel sohbet ve izin verilen kurumsal asistanlara erişim yetkisi.',
        permissions: [PERMISSIONS.PROMPT_READ, PERMISSIONS.RAG_DOCUMENT_READ],
        is_system: true,
      },
      {
        slug: 'hr',
        name: 'İnsan Kaynakları',
        description: 'İK departmanı personeli. İK odaklı RAG belgelerine ve personalara erişir.',
        permissions: [
          PERMISSIONS.RAG_DOCUMENT_READ,
          PERMISSIONS.RAG_DOCUMENT_UPLOAD,
          PERMISSIONS.PROMPT_READ,
        ],
        is_system: false,
      },
      {
        slug: 'developer',
        name: 'Yazılım Geliştirici',
        description: 'Mühendislik ekibi. Kodlama asistanları ve teknik dokümantasyon RAG havuzuna erişir.',
        permissions: [
          PERMISSIONS.RAG_DOCUMENT_READ,
          PERMISSIONS.RAG_DOCUMENT_UPLOAD,
          PERMISSIONS.PROMPT_READ,
        ],
        is_system: false,
      },
      {
        slug: 'finance',
        name: 'Finans',
        description: 'Finans ve Muhasebe departmanı personeli.',
        permissions: [PERMISSIONS.RAG_DOCUMENT_READ, PERMISSIONS.PROMPT_READ],
        is_system: false,
      },
      {
        slug: 'legal',
        name: 'Hukuk',
        description: 'Hukuk ve Uyum departmanı personeli.',
        permissions: [
          PERMISSIONS.RAG_DOCUMENT_READ,
          PERMISSIONS.RAG_DOCUMENT_UPLOAD,
          PERMISSIONS.PROMPT_READ,
        ],
        is_system: false,
      },
    ];

    for (const roleData of defaultRoles) {
      const existing = await roleRepository.findBySlug(roleData.slug);
      if (!existing) {
        await roleRepository.createRole(roleData);
      }
    }
  }

  /**
   * Verilen roller listesine ait birleşik izinler kümesini döner (Önbellek destekli).
   */
  async getPermissionsForRoles(roles: string[]): Promise<Set<string>> {
    if (!roles || roles.length === 0) {
      return new Set();
    }

    const permissions = new Set<string>();

    for (const roleSlug of roles) {
      const cacheKey = `role:permissions:${roleSlug.toLowerCase()}`;
      const cached = await cacheService.get<string[]>(cacheKey);

      if (cached) {
        cached.forEach((p) => permissions.add(p));
        continue;
      }

      const role = await roleRepository.findBySlug(roleSlug);
      if (role?.permissions) {
        role.permissions.forEach((p) => permissions.add(p));
        await cacheService.set(cacheKey, role.permissions, ROLE_CACHE_TTL_SEC);
      }
    }

    return permissions;
  }

  /**
   * Yeni bir dinamik rol tanımlar.
   */
  async createRole(data: {
    slug: string;
    name: string;
    description?: string;
    permissions?: string[];
  }): Promise<IRole> {
    const existing = await roleRepository.findBySlug(data.slug);
    if (existing) {
      throw new ValidationError(`'${data.slug}' isimli rol zaten mevcut.`);
    }

    const role = await roleRepository.createRole({
      ...data,
      is_system: false,
    });

    await cacheService.delPattern('role:*');
    return role;
  }

  /**
   * Rolün sahip olduğu izinleri günceller (Open/Closed - dinamik yetkilendirme).
   */
  async updateRolePermissions(slug: string, permissions: string[]): Promise<IRole> {
    const role = await roleRepository.findBySlug(slug);
    if (!role) {
      throw new NotFoundError(`'${slug}' rolü bulunamadı.`);
    }

    const updated = await roleRepository.updatePermissions(slug, permissions);
    if (!updated) {
      throw new NotFoundError(`Rol güncellenemedi.`);
    }

    // Önbelleği temizle
    await cacheService.delPattern('role:*');
    return updated;
  }

  async getAllRoles(): Promise<IRole[]> {
    return await roleRepository.findAll();
  }
}

export const roleService = new RoleService();
