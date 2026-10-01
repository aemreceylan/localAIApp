/**
 * @file auth.service.ts
 * @description Kimlik doğrulama, ilk kurulum ve oturum yönetimi iş mantığı servisi.
 */

import { authRepository } from '#modules/auth/auth.repository.js';
import { tenantRepository } from '#modules/tenant/index.js';
import {
  hashPassword,
  verifyPassword,
  generateOpaqueToken,
  hashToken,
} from '#modules/auth/auth.utils.js';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '#shared/errors/index.js';
import type {
  SetupSuperAdminDto,
  LoginDto,
  AuthResponseDto,
  UserResponseDto,
} from '#modules/auth/auth.dto.js';
import type { IUser } from '#modules/auth/user.model.js';
import type { ISession } from '#modules/auth/session.model.js';

// Oturum geçerlilik süresi: 7 Gün
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthService {
  /**
   * Sistemde ilk kurulumun (Super Admin oluşturulması) gerekip gerekmediğini denetler.
   */
  async getSetupStatus(): Promise<{ isSetupRequired: boolean }> {
    const hasSuperAdmin = await authRepository.hasSuperAdmin();
    return { isSetupRequired: !hasSuperAdmin };
  }

  /**
   * Sistem ilk açıldığında çalışan tek seferlik Super Admin kurulumu.
   * Eğer sistemde zaten bir Super Admin varsa, 403 Forbidden ile kapıyı sonsuza kadar kilitler.
   */
  async setupSuperAdmin(
    dto: SetupSuperAdminDto,
    meta: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResponseDto> {
    // 1. KONTROL: Sistemde süper admin var mı?
    const hasSuperAdmin = await authRepository.hasSuperAdmin();
    if (hasSuperAdmin) {
      throw new ForbiddenError(
        'Sistem ilk kurulumu daha önce tamamlanmıştır. Doğrudan Super Admin kaydı kapalıdır.'
      );
    }

    // 2. E-posta çakışma kontrolü
    const existing = await authRepository.findByEmail(dto.email);
    if (existing) {
      throw new ValidationError('Bu e-posta adresi ile kayıtlı bir kullanıcı zaten mevcut.');
    }

    // 3. Varsayılan Kurum / Tenant oluştur veya getir
    const organizationName = dto.organizationName || 'NexusAI Kurumsal';
    const defaultTenant = await tenantRepository.findOrCreateDefaultTenant(organizationName);

    // 4. Parolayı güvenli scrypt hash'e dönüştür
    const passwordHash = await hashPassword(dto.password);

    // 5. Super Admin kullanıcısını kaydet
    const user = await authRepository.createUser({
      tenant_id: defaultTenant.slug,
      email: dto.email,
      password_hash: passwordHash,
      first_name: dto.firstName,
      last_name: dto.lastName,
      role: 'superadmin',
      is_active: true,
    });

    // 6. Opaque Bearer Token oluştur ve kaydet
    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await authRepository.createSession({
      tokenHash,
      userId: (user as any)._id.toString(),
      tenantId: user.tenant_id,
      ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
      expiresAt,
    });

    return {
      token: rawToken,
      user: this.mapUserResponse(user),
    };
  }

  /**
   * Kullanıcı girişi (E-posta & Parola) ve Opaque Token üretimi.
   */
  async login(
    dto: LoginDto,
    meta: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResponseDto> {
    const user = await authRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('E-posta adresi veya parola hatalı.');
    }

    const isMatch = await verifyPassword(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('E-posta adresi veya parola hatalı.');
    }

    // Anlık banlama kontrolü
    if (!user.is_active) {
      throw new ForbiddenError(
        'Hesabınız askıya alınmıştır. Lütfen kurum yöneticinizle iletişime geçiniz.'
      );
    }

    // Opaque Bearer Token üret ve hash'le
    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await authRepository.createSession({
      tokenHash,
      userId: (user as any)._id.toString(),
      tenantId: user.tenant_id,
      ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
      expiresAt,
    });

    return {
      token: rawToken,
      user: this.mapUserResponse(user),
    };
  }

  /**
   * Oturumu sonlandırır (Opaque Token DB'den anında silinir).
   */
  async logout(rawToken: string): Promise<{ success: boolean; message: string }> {
    if (!rawToken) {
      return { success: true, message: 'Oturum sonlandırıldı.' };
    }
    const tokenHash = hashToken(rawToken);
    await authRepository.deleteSession(tokenHash);
    return { success: true, message: 'Oturum başarıyla sonlandırıldı.' };
  }

  /**
   * Aktif oturum sahibinin kullanıcı profilini döner.
   */
  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Kullanıcı hesabı bulunamadı.');
    }
    return this.mapUserResponse(user);
  }

  /**
   * Opaque token doğrulaması (Auth Middleware tarafından her istekte çağrılır).
   * Anlık ban ve aktiflik durumunu kontrol eder.
   */
  async validateToken(rawToken: string): Promise<{ user: IUser; session: ISession } | null> {
    if (!rawToken) {
      return null;
    }

    const tokenHash = hashToken(rawToken);
    const result = await authRepository.findSessionWithUser(tokenHash);
    if (!result) {
      return null;
    }

    const { user, session } = result;

    // Kullanıcı anında banlandıysa veya dondurulduysa erişimi reddet
    if (!user.is_active) {
      return null;
    }

    // Arka planda son aktivite zamanını güncelle
    void authRepository.touchSession(tokenHash);

    return { user, session };
  }

  /**
   * Kullanıcı nesnesini hassas verilerden arındırıp DTO formatına dönüştürür.
   */
  private mapUserResponse(user: IUser): UserResponseDto {
    return {
      id: ((user as any)._id || '').toString(),
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      tenantId: user.tenant_id,
      isActive: user.is_active,
    };
  }
}

export const authService = new AuthService();
