/**
 * @file auth.service.ts
 * @description Kimlik doğrulama, ilk kurulum, rol atama ve oturum yönetimi iş mantığı servisi.
 * Tek kurum mimarisine uygun olarak SaaS tenant bağımlılığından tamamen arındırılmıştır.
 */

import { authRepository } from '#modules/auth/auth.repository.js';
import { auditService } from '#modules/audit/index.js';
import { cacheService } from '#shared/cache/index.js';
import {
  hashPassword,
  verifyPassword,
  generateOpaqueToken,
  hashToken,
} from '#modules/auth/auth.utils.js';
import { PolicyEngine } from '#modules/role/policy.engine.js';
import { PERMISSIONS } from '#modules/role/role.types.js';
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
  TransferSuperAdminDto,
} from '#modules/auth/auth.dto.js';
import type { IUser } from '#modules/auth/user.model.js';
import type { ISession } from '#modules/auth/session.model.js';

// Oturum geçerlilik süresi: 7 Gün
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthRequestMeta {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

function buildAuditMeta(meta?: AuthRequestMeta): { ipAddress?: string; userAgent?: string } {
  const result: { ipAddress?: string; userAgent?: string } = {};
  if (meta?.ipAddress) result.ipAddress = meta.ipAddress;
  if (meta?.userAgent) result.userAgent = meta.userAgent;
  return result;
}

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
    meta?: AuthRequestMeta
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

    // 3. Parolayı güvenli scrypt hash'e dönüştür
    const passwordHash = await hashPassword(dto.password);

    // 4. Tek Super Admin kullanıcısını kaydet
    const user = await authRepository.createUser({
      email: dto.email,
      password_hash: passwordHash,
      first_name: dto.firstName,
      last_name: dto.lastName,
      system_role: 'superadmin',
      roles: ['admin'],
      is_active: true,
    });

    // 5. Denetim İzi (Audit Log)
    await auditService.log({
      actor: { _id: (user as any)._id, email: user.email, system_role: user.system_role },
      action: 'ADMIN_ASSIGNED',
      targetId: (user as any)._id.toString(),
      targetType: 'user',
      details: { role: 'superadmin', note: 'İlk kurulum Super Admin oluşturuldu.' },
      ...buildAuditMeta(meta),
    });

    // 6. Opaque Bearer Token oluştur ve kaydet
    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await authRepository.createSession({
      tokenHash,
      userId: (user as any)._id.toString(),
      ...(meta?.ipAddress ? { ipAddress: meta.ipAddress } : {}),
      ...(meta?.userAgent ? { userAgent: meta.userAgent } : {}),
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
    meta?: AuthRequestMeta
  ): Promise<AuthResponseDto> {
    const user = await authRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('E-posta adresi veya parola hatalı.');
    }

    const isMatch = await verifyPassword(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('E-posta adresi veya parola hatalı.');
    }

    // ANLIK BANLAMA KONTROLÜ
    if (!user.is_active) {
      await auditService.log({
        actor: { email: user.email },
        action: 'LOGIN_FAILED_BANNED',
        targetId: (user as any)._id.toString(),
        targetType: 'user',
        details: { reason: 'Banlı kullanıcı giriş denemesi' },
        ...buildAuditMeta(meta),
      });

      throw new ForbiddenError(
        'Hesabınız askıya alınmıştır/banlanmıştır. Lütfen kurum yöneticinizle iletişime geçiniz.'
      );
    }

    // Opaque Bearer Token üret ve hash'le
    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await authRepository.createSession({
      tokenHash,
      userId: (user as any)._id.toString(),
      ...(meta?.ipAddress ? { ipAddress: meta.ipAddress } : {}),
      ...(meta?.userAgent ? { userAgent: meta.userAgent } : {}),
      expiresAt,
    });

    return {
      token: rawToken,
      user: this.mapUserResponse(user),
    };
  }

  /**
   * Oturumu sonlandırır (Opaque Token DB'den ve Redis'ten anında silinir).
   */
  async logout(rawToken: string): Promise<{ success: boolean; message: string }> {
    if (!rawToken) {
      return { success: true, message: 'Oturum sonlandırıldı.' };
    }
    const tokenHash = hashToken(rawToken);
    await authRepository.deleteSession(tokenHash);
    await cacheService.del(`auth:session:${tokenHash}`);
    return { success: true, message: 'Oturum başarıyla sonlandırıldı.' };
  }

  /**
   * Bir kullanıcının Redis ve veritabanındaki tüm aktif oturumlarını anında geçersizleştirir.
   * Anlık ban ve yetki değişikliklerinde derhal çağrılır (Zero-Context-Leakage & Instant Revocation).
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    try {
      const userSessionsKey = `auth:user_sessions:${userId}`;
      const tokens = (await cacheService.get<string[]>(userSessionsKey)) || [];

      // Veritabanındaki tüm mevcut oturumları da ekleyerek hiçbir token'ın kaçmamasını sağla
      const dbSessions = await authRepository.findSessionsByUserId(userId);
      const allTokenHashes = new Set<string>([...tokens, ...dbSessions.map((s) => s.token_hash)]);

      for (const tokenHash of allTokenHashes) {
        await cacheService.del(`auth:session:${tokenHash}`);
      }
      await cacheService.del(userSessionsKey);
    } catch (err) {
      console.warn('[AuthService] Kullanıcı oturum önbellekleri temizlenirken uyarı:', err);
    }
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
   * Redis Read-Through önbellek desteğiyle sub-millisecond (~0.5ms) yanıt verir.
   * Anlık ban ve aktiflik durumunu kesinlikle denetler.
   */
  async validateToken(rawToken: string): Promise<{ user: IUser; session: ISession } | null> {
    if (!rawToken) {
      return null;
    }

    const tokenHash = hashToken(rawToken);
    const sessionCacheKey = `auth:session:${tokenHash}`;

    // 1. Redis önbelleğinden oku (0 ms DB okuma, ~0.5ms toplam süre)
    const cached = await cacheService.get<{
      user: IUser;
      session: ISession;
      lastActiveAtMs?: number;
    }>(sessionCacheKey);

    if (cached) {
      // Anlık Ban / Pasiflik Kontrolü (Güvenlik Önceliği)
      if (!cached.user.is_active) {
        await cacheService.del(sessionCacheKey);
        await authRepository.deleteSession(tokenHash);
        return null;
      }

      // Süre aşımı kontrolü
      if (new Date() > new Date(cached.session.expires_at)) {
        await cacheService.del(sessionCacheKey);
        await authRepository.deleteSession(tokenHash);
        return null;
      }

      // Throttled touchSession: En az 5 dakika (300.000 ms) geçtiyse MongoDB'ye yaz
      const now = Date.now();
      if (!cached.lastActiveAtMs || now - cached.lastActiveAtMs > 300000) {
        cached.lastActiveAtMs = now;
        cached.session.last_active_at = new Date(now);
        void authRepository.touchSession(tokenHash);
        const remainingTtl = Math.max(
          60,
          Math.floor((new Date(cached.session.expires_at).getTime() - now) / 1000)
        );
        void cacheService.set(sessionCacheKey, cached, remainingTtl);
      }

      return { user: cached.user, session: cached.session };
    }

    // 2. Önbellekte yoksa MongoDB'den sorgula
    const result = await authRepository.findSessionWithUser(tokenHash);
    if (!result) {
      return null;
    }

    const { user, session } = result;

    // Kullanıcı anında banlandıysa veya dondurulduysa oturumu iptal et
    if (!user.is_active) {
      await authRepository.deleteSession(tokenHash);
      return null;
    }

    const now = Date.now();
    const remainingTtl = Math.max(
      60,
      Math.floor((new Date(session.expires_at).getTime() - now) / 1000)
    );

    // Redis önbelleğine oturumu kaydet
    await cacheService.set(
      sessionCacheKey,
      { user, session, lastActiveAtMs: now },
      remainingTtl
    );

    // Kullanıcının aktif token indeksine ekle
    const userId = ((user as any)._id || '').toString();
    if (userId) {
      const userSessionsKey = `auth:user_sessions:${userId}`;
      const userTokens = (await cacheService.get<string[]>(userSessionsKey)) || [];
      if (!userTokens.includes(tokenHash)) {
        userTokens.push(tokenHash);
        await cacheService.set(userSessionsKey, userTokens, remainingTtl);
      }
    }

    // Arka planda son aktivite zamanını güncelle
    void authRepository.touchSession(tokenHash);

    return { user, session };
  }

  /**
   * SUPERADMIN DEVRİ:
   * Mevcut Superadmin, rolünü güvenli parola doğrulaması ile başka bir kullanıcıya devreder.
   */
  async transferSuperAdmin(
    actor: IUser,
    dto: TransferSuperAdminDto,
    meta?: AuthRequestMeta
  ): Promise<{ success: boolean; message: string }> {
    if (actor.system_role !== 'superadmin') {
      throw new ForbiddenError('Yalnızca mevcut Superadmin sahiplik devri gerçekleştirebilir.');
    }

    const isMatch = await verifyPassword(dto.passwordConfirm, actor.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Sahiplik devri için girdiğiniz parola hatalı.');
    }

    const targetUser = await authRepository.findById(dto.targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Hedef kullanıcı bulunamadı.');
    }

    if (!targetUser.is_active) {
      throw new ValidationError('Askıya alınmış (banlı) bir kullanıcıya sahiplik devredilemez.');
    }

    const actorId = (actor as any)._id.toString();
    const targetId = (targetUser as any)._id.toString();

    if (actorId === targetId) {
      throw new ValidationError('Zaten sistemin Superadmin kullanıcısısınız.');
    }

    // 1. Yeni kullanıcıyı superadmin yap
    await authRepository.updateUserSystemRole(targetId, 'superadmin');
    // 2. Mevcut kullanıcıyı admin seviyesine düşür
    await authRepository.updateUserSystemRole(actorId, 'admin');

    // 3. Her iki kullanıcının oturumlarını sonlandır (yeni yetkilerle tekrar giriş zorunlu)
    await this.invalidateUserSessions(actorId);
    await this.invalidateUserSessions(targetId);
    await authRepository.deleteAllSessionsForUser(actorId);
    await authRepository.deleteAllSessionsForUser(targetId);

    // 4. Denetim İzi
    await auditService.log({
      actor: { _id: (actor as any)._id, email: actor.email, system_role: actor.system_role },
      action: 'SUPERADMIN_TRANSFERRED',
      targetId,
      targetType: 'user',
      details: { previousSuperAdmin: actor.email, newSuperAdmin: targetUser.email },
      ...buildAuditMeta(meta),
    });

    return { success: true, message: 'Superadmin yetkisi başarıyla yeni kullanıcıya devredildi.' };
  }

  /**
   * ADMİN ATAMA (Superadmin veya 'admin:user:assign_admin' yetkisine sahip Yöneticiler):
   * Bir kullanıcıya 'admin' sistem rolü atar.
   */
  async assignAdmin(
    actor: IUser,
    targetUserId: string,
    meta?: AuthRequestMeta
  ): Promise<UserResponseDto> {
    const isAuthorized =
      actor.system_role === 'superadmin' ||
      (await PolicyEngine.can(actor, PERMISSIONS.ADMIN_USER_ASSIGN_ADMIN));

    if (!isAuthorized) {
      throw new ForbiddenError('Diğer kullanıcılara Admin yetkisi atama izniniz bulunmamaktadır.');
    }

    const targetUser = await authRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Hedef kullanıcı bulunamadı.');
    }

    if (targetUser.system_role === 'superadmin') {
      throw new ValidationError('Superadmin rolü üzerinde bu işlem yapılamaz.');
    }

    const updated = await authRepository.updateUserSystemRole(targetUserId, 'admin');
    if (!updated) {
      throw new NotFoundError('Kullanıcı güncellenemedi.');
    }

    // Hedef kullanıcının tüm oturumlarını anında sonlandır (Yetki değişikliği hemen geçerli olsun)
    await this.invalidateUserSessions(targetUserId);
    await authRepository.deleteAllSessionsForUser(targetUserId);
    await cacheService.delPattern('role:*');

    await auditService.log({
      actor: { _id: (actor as any)._id, email: actor.email, system_role: actor.system_role },
      action: 'ADMIN_ASSIGNED',
      targetId: targetUserId,
      targetType: 'user',
      details: { email: targetUser.email },
      ...buildAuditMeta(meta),
    });

    return this.mapUserResponse(updated);
  }

  /**
   * ADMİN YETKİSİNİ GERİ ALMA (Superadmin veya 'admin:user:assign_admin' yetkisine sahip Yöneticiler)
   */
  async revokeAdmin(
    actor: IUser,
    targetUserId: string,
    meta?: AuthRequestMeta
  ): Promise<UserResponseDto> {
    const isAuthorized =
      actor.system_role === 'superadmin' ||
      (await PolicyEngine.can(actor, PERMISSIONS.ADMIN_USER_ASSIGN_ADMIN));

    if (!isAuthorized) {
      throw new ForbiddenError('Bir kullanıcının Admin yetkisini geri alma izniniz bulunmamaktadır.');
    }

    const targetUser = await authRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Hedef kullanıcı bulunamadı.');
    }

    if (targetUser.system_role === 'superadmin') {
      throw new ValidationError('Superadmin yetkisi bu işlemle geri alınamaz.');
    }

    // Normal bir admin başka bir adminin yetkisini geri alamaz (Yalnızca Superadmin)
    if (actor.system_role !== 'superadmin' && targetUser.system_role === 'admin') {
      throw new ForbiddenError('Mevcut bir yöneticinin adminliği yalnızca Superadmin tarafından geri alınabilir.');
    }

    const updated = await authRepository.updateUserSystemRole(targetUserId, 'user');
    if (!updated) {
      throw new NotFoundError('Kullanıcı güncellenemedi.');
    }

    // Oturumları anında temizle
    await this.invalidateUserSessions(targetUserId);
    await authRepository.deleteAllSessionsForUser(targetUserId);
    await cacheService.delPattern('role:*');

    await auditService.log({
      actor: { _id: (actor as any)._id, email: actor.email, system_role: actor.system_role },
      action: 'ADMIN_REVOKED',
      targetId: targetUserId,
      targetType: 'user',
      details: { email: targetUser.email },
      ...buildAuditMeta(meta),
    });

    return this.mapUserResponse(updated);
  }

  /**
   * KULLANICI BANLAMA (Hesabı Askıya Alma):
   * Anında tüm cihaz oturumlarını sonlandırır.
   */
  async banUser(
    actor: IUser,
    targetUserId: string,
    reason?: string,
    meta?: AuthRequestMeta
  ): Promise<UserResponseDto> {
    const actorId = (actor as any)._id.toString();
    if (actorId === targetUserId) {
      throw new ValidationError('Kendi hesabınızı banlayamazsınız.');
    }

    const targetUser = await authRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Kullanıcı bulunamadı.');
    }

    // Superadmin Dokunulmazlığı
    if (targetUser.system_role === 'superadmin') {
      throw new ForbiddenError('Superadmin hesabı asla banlanamaz veya askıya alınamaz.');
    }

    // Admin koruması: Bir normal admin başka bir admini banlayamaz (Yalnızca Superadmin admini banlayabilir)
    if (actor.system_role !== 'superadmin' && targetUser.system_role === 'admin') {
      throw new ForbiddenError('Bir yönetici (Admin) yalnızca Superadmin tarafından askıya alınabilir.');
    }

    const updated = await authRepository.updateUserStatus(targetUserId, false);
    if (!updated) {
      throw new NotFoundError('Kullanıcı güncellenemedi.');
    }

    // GÜVENLİK: Kullanıcının tüm oturumlarını anında sonlandır!
    await this.invalidateUserSessions(targetUserId);
    await authRepository.deleteAllSessionsForUser(targetUserId);
    await cacheService.delPattern('role:*');

    await auditService.log({
      actor: { _id: (actor as any)._id, email: actor.email, system_role: actor.system_role },
      action: 'USER_BANNED',
      targetId: targetUserId,
      targetType: 'user',
      details: { email: targetUser.email, reason },
      ...buildAuditMeta(meta),
    });

    return this.mapUserResponse(updated);
  }

  /**
   * KULLANICI BANINI KALDIRMA
   */
  async unbanUser(
    actor: IUser,
    targetUserId: string,
    meta?: AuthRequestMeta
  ): Promise<UserResponseDto> {
    const targetUser = await authRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Kullanıcı bulunamadı.');
    }

    const updated = await authRepository.updateUserStatus(targetUserId, true);
    if (!updated) {
      throw new NotFoundError('Kullanıcı güncellenemedi.');
    }

    await auditService.log({
      actor: { _id: (actor as any)._id, email: actor.email, system_role: actor.system_role },
      action: 'USER_UNBANNED',
      targetId: targetUserId,
      targetType: 'user',
      details: { email: targetUser.email },
      ...buildAuditMeta(meta),
    });

    return this.mapUserResponse(updated);
  }

  /**
   * KULLANICIYA FONKSİYONEL ROLLER ATAMA (örn: ['hr', 'developer'])
   */
  async assignUserRoles(
    actor: IUser,
    targetUserId: string,
    roles: string[],
    meta?: AuthRequestMeta
  ): Promise<UserResponseDto> {
    const targetUser = await authRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Kullanıcı bulunamadı.');
    }

    if (targetUser.system_role === 'superadmin') {
      throw new ForbiddenError('Superadmin hesabına rol atanamaz veya rolleri değiştirilemez.');
    }

    const updated = await authRepository.updateUserRoles(targetUserId, roles);
    if (!updated) {
      throw new NotFoundError('Kullanıcı güncellenemedi.');
    }

    // Rol değişikliğinde oturumları tazelemesi için oturumları sonlandır ve cache temizle
    await this.invalidateUserSessions(targetUserId);
    await authRepository.deleteAllSessionsForUser(targetUserId);
    await cacheService.delPattern('role:*');

    await auditService.log({
      actor: { _id: (actor as any)._id, email: actor.email, system_role: actor.system_role },
      action: 'ROLES_ASSIGNED',
      targetId: targetUserId,
      targetType: 'user',
      details: { email: targetUser.email, assignedRoles: roles },
      ...buildAuditMeta(meta),
    });

    return this.mapUserResponse(updated);
  }

  /**
   * KULLANICI İSTİSNAİ YETKİLERİNİ GÜNCELLEME (Allow / Deny Override):
   * Belirli bir kullanıcıya rolünden bağımsız doğrudan yetki verir veya rolündeki bir yetkiyi engeller.
   */
  async overrideUserPermissions(
    actor: IUser,
    targetUserId: string,
    allow: string[],
    deny: string[],
    meta?: AuthRequestMeta
  ): Promise<UserResponseDto> {
    const targetUser = await authRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Kullanıcı bulunamadı.');
    }

    if (targetUser.system_role === 'superadmin') {
      throw new ForbiddenError('Superadmin hesabı üzerinde izin ezme/override işlemi yapılamaz.');
    }

    const updated = await authRepository.updateCustomPermissions(targetUserId, { allow, deny });
    if (!updated) {
      throw new NotFoundError('Kullanıcı güncellenemedi.');
    }

    // Yetki değişikliğinin anında geçerli olması için oturumları ve önbelleği tazele
    await this.invalidateUserSessions(targetUserId);
    await authRepository.deleteAllSessionsForUser(targetUserId);
    await cacheService.delPattern('role:*');

    await auditService.log({
      actor: { _id: (actor as any)._id, email: actor.email, system_role: actor.system_role },
      action: 'PERMISSIONS_OVERRIDDEN',
      targetId: targetUserId,
      targetType: 'user',
      details: { email: targetUser.email, allow, deny },
      ...buildAuditMeta(meta),
    });

    return this.mapUserResponse(updated);
  }

  /**
   * Tüm kullanıcıları listeler.
   */
  async listUsers(): Promise<UserResponseDto[]> {
    const users = await authRepository.findAllUsers();
    return users.map((u) => this.mapUserResponse(u));
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
      systemRole: user.system_role,
      roles: user.roles || [],
      customPermissions: user.custom_permissions || { allow: [], deny: [] },
      isActive: user.is_active,
    };
  }
}

export const authService = new AuthService();
