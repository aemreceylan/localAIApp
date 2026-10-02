/**
 * @file role.types.ts
 * @description Rol ve Yetkilendirme Tipi Tanımları.
 * Sistem Open/Closed prensibine tam uyumlu Resource:Action formatında modellenmiştir.
 */

import type { IUser } from '#modules/auth/user.model.js';

export const PERMISSIONS = {
  // Kullanıcı Yönetimi
  USER_READ: 'user:read',
  USER_MANAGE_ROLES: 'user:manage_roles',
  USER_BAN: 'user:ban',
  USER_UNBAN: 'user:unban',

  // Admin Yönetimi (Yalnızca Superadmin)
  ADMIN_CREATE: 'admin:create',
  ADMIN_REVOKE: 'admin:revoke',
  ADMIN_TRANSFER_OWNERSHIP: 'admin:transfer_ownership',

  // RAG Bilgi Bankası ve Belge Yönetimi
  RAG_DOCUMENT_READ: 'rag:document:read',
  RAG_DOCUMENT_UPLOAD: 'rag:document:upload',
  RAG_DOCUMENT_UPDATE_ROLES: 'rag:document:update_roles',
  RAG_DOCUMENT_DELETE: 'rag:document:delete',

  // Prompt ve Persona Yönetimi
  PROMPT_READ: 'prompt:read',
  PROMPT_CREATE: 'prompt:create',
  PROMPT_MANAGE: 'prompt:manage',

  // Model Yönetimi
  MODEL_MANAGE: 'model:manage',

  // Denetim Günlükleri
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | string;

/**
 * Open/Closed Prensibi Strateji Arayüzü:
 * Özel bir kaynak için yetki denetimi eklenmek istendiğinde bu arayüz uygulanır
 * ve PolicyEngine'e kaydedilir. Çekirdek kod değiştirilmez.
 */
export interface IPermissionStrategy {
  can(user: IUser, permission: string, context?: any): Promise<boolean> | boolean;
}
