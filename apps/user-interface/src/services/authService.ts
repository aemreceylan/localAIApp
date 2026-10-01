/**
 * @file authService.ts
 * @description Kimlik doğrulama, ilk kurulum (bootstrap) ve kullanıcı profil API istemci servisi.
 */

import { apiFetch } from '#services/apiClient';
import type {
  AuthResponse,
  LoginPayload,
  SetupStatusResponse,
  SetupSuperAdminPayload,
  User,
} from '#types/auth.types';

export const authService = {
  /**
   * Sistemde henüz bir Super Admin kullanıcısı bulunup bulunmadığını (ilk kurulum gerekip gerekmediğini) sorgular.
   */
  async getSetupStatus(): Promise<SetupStatusResponse> {
    const res = await apiFetch<{ success: boolean; data: SetupStatusResponse }>(
      '/api/auth/setup-status'
    );
    return res.data;
  },

  /**
   * Sistem ilk açıldığında çalışan tek seferlik Super Admin ve kurumsal alan kurulumunu yapar.
   */
  async setupSuperAdmin(payload: SetupSuperAdminPayload): Promise<AuthResponse> {
    const res = await apiFetch<{ success: boolean; data: AuthResponse }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /**
   * E-posta ve parola ile kullanıcı girişi yapar ve Opaque Bearer token üretir.
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiFetch<{ success: boolean; data: AuthResponse }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /**
   * Aktif oturumu sonlandırır ve veritabanından kalıcı olarak temizler.
   */
  async logout(): Promise<void> {
    try {
      await apiFetch<{ success: boolean; message: string }>('/api/auth/logout', {
        method: 'POST',
      });
    } catch (err) {
      console.warn('[AuthService] Logout çağrısı sırasında uyarı (yerel oturum temizleniyor):', err);
    } finally {
      localStorage.removeItem('nexus_token');
    }
  },

  /**
   * Aktif Opaque Bearer token üzerinden kullanıcı profilini sorgular.
   */
  async getCurrentUser(): Promise<User> {
    const res = await apiFetch<{ success: boolean; data: User }>('/api/auth/me');
    return res.data;
  },
};
