/**
 * @file authService.ts
 * @description Admin Paneli Kimlik Doğrulama, Kullanıcı ve Rol Yönetimi API Servisi.
 */

import { apiClient } from '#services/apiClient.js';
import type { User, SetupStatus, Invitation, CreateInvitationPayload } from '#types/auth.js';

export const authService = {
  /**
   * İlk kurulum durumunu sorgular.
   */
  async getSetupStatus(): Promise<SetupStatus> {
    return await apiClient<SetupStatus>('/api/auth/setup-status');
  },

  /**
   * İlk Super Admin kaydı (Kurulum).
   */
  async setupSuperAdmin(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ user: User; token: string }> {
    return await apiClient<{ user: User; token: string }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Yönetici girişi.
   */
  async login(payload: { email: string; password: string }): Promise<{ user: User; token: string }> {
    return await apiClient<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Oturumu kapatır (HttpOnly çerezi sunucuda temizlenir).
   */
  async logout(): Promise<void> {
    await apiClient('/api/auth/logout', { method: 'POST' });
  },

  /**
   * Aktif kullanıcı profilini sorgular.
   */
  async getMe(): Promise<User> {
    return await apiClient<User>('/api/auth/me');
  },

  /**
   * Onay bekleyen personelleri listeler.
   */
  async getPendingUsers(): Promise<User[]> {
    return await apiClient<User[]>('/api/auth/users/pending');
  },

  /**
   * Bekleyen kullanıcıyı onaylar ve rollerini atar.
   */
  async approveUser(userId: string, roles?: string[]): Promise<User> {
    return await apiClient<User>(`/api/auth/users/${userId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ roles }),
    });
  },

  /**
   * Bekleyen kullanıcı başvurusunu gerekçeli reddeder.
   */
  async rejectUser(userId: string, reason?: string): Promise<User> {
    return await apiClient<User>(`/api/auth/users/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Tüm personelleri listeler.
   */
  async listUsers(): Promise<User[]> {
    return await apiClient<User[]>('/api/auth/users');
  },

  /**
   * Kullanıcıyı banlar / askıya alır.
   */
  async banUser(userId: string, reason?: string): Promise<User> {
    return await apiClient<User>(`/api/auth/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Kullanıcının banını kaldırır.
   */
  async unbanUser(userId: string): Promise<User> {
    return await apiClient<User>(`/api/auth/users/${userId}/unban`, {
      method: 'POST',
    });
  },

  /**
   * Kullanıcıya departman/fonksiyonel rolleri atar.
   */
  async assignUserRoles(userId: string, roles: string[]): Promise<User> {
    return await apiClient<User>(`/api/auth/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    });
  },

  /**
   * Kullanıcıya özel izin ezme (allow/deny override).
   */
  async overridePermissions(userId: string, allow: string[], deny: string[]): Promise<User> {
    return await apiClient<User>(`/api/auth/users/${userId}/permissions/override`, {
      method: 'PUT',
      body: JSON.stringify({ allow, deny }),
    });
  },

  /**
   * Davetiye kodlarını listeler.
   */
  async listInvitations(): Promise<Invitation[]> {
    return await apiClient<Invitation[]>('/api/auth/invitations');
  },

  /**
   * Yeni davet kodu oluşturur.
   */
  async createInvitation(payload: CreateInvitationPayload): Promise<Invitation> {
    return await apiClient<Invitation>('/api/auth/invitations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Davet kodunu iptal eder.
   */
  async revokeInvitation(code: string): Promise<void> {
    await apiClient(`/api/auth/invitations/${code}`, {
      method: 'DELETE',
    });
  },
};
