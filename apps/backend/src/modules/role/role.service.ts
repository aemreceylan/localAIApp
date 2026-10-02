/**
 * @file role.service.ts
 * @description Kurumsal Rol ve Yetki Yönetim Servisi.
 * Redis/Memory önbellekleme desteği, arketip tabanlı tavan yetki havuzu denetimi
 * ve varsayılan rol belirleme mantığını içerir.
 */

import { roleRepository } from '#modules/role/role.repository.js';
import { cacheService } from '#shared/cache/index.js';
import { PERMISSIONS, type RoleArchetype } from '#modules/role/role.types.js';
import type { IRole } from '#modules/role/role.model.js';
import { ValidationError, NotFoundError } from '#shared/errors/index.js';

const ROLE_CACHE_TTL_SEC = 300; // 5 Dakika

export class RoleService {
  /**
   * Sistem ilk ayağa kalktığında temel sistem ve kullanıcı rollerini tohumlar.
   */
  async initDefaultRoles(): Promise<void> {
    const defaultRoles: Array<{
      slug: string;
      name: string;
      description: string;
      base_archetype: RoleArchetype;
      permissions: string[];
      is_default: boolean;
      is_system: boolean;
    }> = [
      {
        slug: 'system_admin',
        name: 'Sistem Yöneticisi',
        description: 'Tüm sistem, model, prompt, RAG ve kullanıcı yönetimi yetkilerine sahip yönetici rolü.',
        base_archetype: 'admin',
        permissions: Object.values(PERMISSIONS),
        is_default: false,
        is_system: true,
      },
      {
        slug: 'default_user',
        name: 'Standart Personel',
        description: 'Genel sohbet ve izin verilen kurumsal asistanlara erişim için varsayılan kullanıcı rolü.',
        base_archetype: 'user',
        permissions: [
          PERMISSIONS.USER_CHAT_CREATE,
          PERMISSIONS.USER_CHAT_HISTORY,
          PERMISSIONS.USER_CHAT_EXPORT,
          PERMISSIONS.USER_RAG_SEARCH,
          PERMISSIONS.USER_RAG_READ,
          PERMISSIONS.USER_PROMPT_READ,
          PERMISSIONS.USER_MODEL_USE,
          PERMISSIONS.USER_PROFILE_MANAGE,
        ],
        is_default: true,
        is_system: true,
      },
      {
        slug: 'hr',
        name: 'İnsan Kaynakları',
        description: 'İK departmanı personeli. İK odaklı RAG belgelerine ve personalara erişir.',
        base_archetype: 'user',
        permissions: [
          PERMISSIONS.USER_CHAT_CREATE,
          PERMISSIONS.USER_CHAT_HISTORY,
          PERMISSIONS.USER_RAG_SEARCH,
          PERMISSIONS.USER_RAG_READ,
          PERMISSIONS.USER_PROMPT_READ,
          PERMISSIONS.USER_MODEL_USE,
        ],
        is_default: false,
        is_system: false,
      },
      {
        slug: 'developer',
        name: 'Yazılım Geliştirici',
        description: 'Mühendislik ekibi. Kodlama asistanları ve teknik dokümantasyon RAG havuzuna erişir.',
        base_archetype: 'user',
        permissions: [
          PERMISSIONS.USER_CHAT_CREATE,
          PERMISSIONS.USER_CHAT_HISTORY,
          PERMISSIONS.USER_RAG_SEARCH,
          PERMISSIONS.USER_RAG_READ,
          PERMISSIONS.USER_PROMPT_READ,
          PERMISSIONS.USER_MODEL_USE,
        ],
        is_default: false,
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
   * Sistemdeki varsayılan kullanıcı rolünü döner.
   */
  async getDefaultRole(): Promise<IRole> {
    const defaultRole = await roleRepository.findDefaultRole();
    if (defaultRole) {
      return defaultRole;
    }

    const fallback = await roleRepository.findBySlug('default_user');
    if (fallback) {
      return fallback;
    }

    throw new NotFoundError('Sistemde tanımlı varsayılan bir kullanıcı rolü bulunamadı.');
  }

  /**
   * Admin tarafından yeni bir varsayılan kullanıcı rolü belirlenir.
   * GÜVENLİK: Yalnızca 'user' arketipine sahip roller varsayılan yapılabilir!
   */
  async setDefaultRole(slug: string): Promise<IRole> {
    const role = await roleRepository.findBySlug(slug);
    if (!role) {
      throw new NotFoundError(`'${slug}' rolü bulunamadı.`);
    }

    if (role.base_archetype !== 'user') {
      throw new ValidationError(
        "Güvenlik Kısıtlaması: Yalnızca 'user' arketipindeki roller varsayılan kullanıcı rolü olarak belirlenebilir."
      );
    }

    const updated = await roleRepository.setDefaultRole(slug);
    if (!updated) {
      throw new NotFoundError('Varsayılan rol güncellenemedi.');
    }

    await cacheService.delPattern('role:*');
    return updated;
  }

  /**
   * Yeni bir dinamik rol tanımlar.
   * GÜVENLİK: 'user' arketipinde bir role 'admin:' izinleri verilemez.
   */
  async createRole(data: {
    slug: string;
    name: string;
    description?: string;
    base_archetype: RoleArchetype;
    permissions?: string[];
  }): Promise<IRole> {
    const existing = await roleRepository.findBySlug(data.slug);
    if (existing) {
      throw new ValidationError(`'${data.slug}' isimli rol zaten mevcut.`);
    }

    // Yetki tavanı kuralı
    if (data.base_archetype === 'user' && data.permissions?.some((p) => p.startsWith('admin:'))) {
      throw new ValidationError(
        "Yetki Tavanı İhlali: 'user' arketipindeki bir role 'admin:' seviyesinde yetki tanımlanamaz."
      );
    }

    const role = await roleRepository.createRole({
      ...data,
      is_default: false,
      is_system: false,
    });

    await cacheService.delPattern('role:*');
    return role;
  }

  /**
   * Rolün sahip olduğu izinleri günceller.
   * GÜVENLİK: Rol arketip tavan kısıtlamasına uyulmalıdır.
   */
  async updateRolePermissions(slug: string, permissions: string[]): Promise<IRole> {
    const role = await roleRepository.findBySlug(slug);
    if (!role) {
      throw new NotFoundError(`'${slug}' rolü bulunamadı.`);
    }

    // Arketip tavan kontrolü
    if (role.base_archetype === 'user' && permissions.some((p) => p.startsWith('admin:'))) {
      throw new ValidationError(
        "Yetki Tavanı İhlali: 'user' arketipindeki bir role 'admin:' seviyesinde yetki atanamaz."
      );
    }

    const updated = await roleRepository.updatePermissions(slug, permissions);
    if (!updated) {
      throw new NotFoundError('Rol güncellenemedi.');
    }

    await cacheService.delPattern('role:*');
    return updated;
  }

  async getAllRoles(): Promise<IRole[]> {
    return await roleRepository.findAll();
  }
}

export const roleService = new RoleService();
