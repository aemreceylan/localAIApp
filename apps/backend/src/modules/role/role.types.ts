/**
 * @file role.types.ts
 * @description Kurumsal Rol ve Yetkilendirme Tipi Tanımları.
 * Sistem Open/Closed prensibine tam uyumlu 3 parçalı standartta modellenmiştir:
 * Format: <ana_rol_arketipi>:<kaynak/kategori>:<eylem>
 * Örnek: 'admin:user:ban', 'admin:model:manage', 'user:chat:create'
 */

import type { IUser } from '#modules/auth/user.model.js';

export type RoleArchetype = 'admin' | 'user';

export const PERMISSIONS = {
  // ==========================================
  // USER HAVUZU (user:*)
  // Hem User hem Admin arketipindeki roller alabilir
  // ==========================================
  USER_CHAT_CREATE: 'user:chat:create',
  USER_CHAT_HISTORY: 'user:chat:history',
  USER_CHAT_EXPORT: 'user:chat:export',
  USER_RAG_SEARCH: 'user:rag:search',
  USER_RAG_READ: 'user:rag:read',
  USER_PROMPT_READ: 'user:prompt:read',
  USER_MODEL_USE: 'user:model:use',
  USER_PROFILE_MANAGE: 'user:profile:manage',

  // ==========================================
  // ADMIN HAVUZU (admin:*)
  // YALNIZCA Admin arketipindeki roller alabilir
  // ==========================================
  // 1. Kullanıcı ve Yönetici Yönetimi
  ADMIN_USER_READ: 'admin:user:read',
  ADMIN_USER_CREATE: 'admin:user:create',
  ADMIN_USER_BAN: 'admin:user:ban',
  ADMIN_USER_UNBAN: 'admin:user:unban',
  ADMIN_USER_ASSIGN_ROLE: 'admin:user:assign_role',
  ADMIN_USER_ASSIGN_ADMIN: 'admin:user:assign_admin',
  ADMIN_USER_OVERRIDE: 'admin:user:override',

  // 2. Rol ve Şablon Yönetimi
  ADMIN_ROLE_READ: 'admin:role:read',
  ADMIN_ROLE_CREATE: 'admin:role:create',
  ADMIN_ROLE_UPDATE: 'admin:role:update',
  ADMIN_ROLE_DELETE: 'admin:role:delete',
  ADMIN_ROLE_SET_DEFAULT: 'admin:role:set_default',

  // 3. RAG Bilgi Bankası ve Belge Yönetimi
  ADMIN_RAG_UPLOAD: 'admin:rag:upload',
  ADMIN_RAG_UPDATE_ROLES: 'admin:rag:update_roles',
  ADMIN_RAG_DELETE: 'admin:rag:delete',
  ADMIN_RAG_SYNC: 'admin:rag:sync',

  // 4. Prompt, Persona ve Kural Yönetimi
  ADMIN_PROMPT_CREATE: 'admin:prompt:create',
  ADMIN_PROMPT_MANAGE: 'admin:prompt:manage',

  // 5. Model ve Altyapı Yönetimi
  ADMIN_MODEL_READ: 'admin:model:read',
  ADMIN_MODEL_MANAGE: 'admin:model:manage',
  ADMIN_MODEL_SET_DEFAULT: 'admin:model:set_default',

  // 6. Denetim (Audit) ve Kök Sistem
  ADMIN_AUDIT_READ: 'admin:audit:read',
  ADMIN_SYSTEM_TRANSFER: 'admin:system:transfer',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | (string & {});

/**
 * Open/Closed Prensibi Strateji Arayüzü:
 * Özel bir kaynak için yetki denetimi eklenmek istendiğinde bu arayüz uygulanır
 * ve PolicyEngine'e kaydedilir.
 */
export interface IPermissionStrategy {
  can(user: IUser, permission: string, context?: any): Promise<boolean> | boolean;
}
