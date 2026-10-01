/**
 * @file auth.repository.ts
 * @description Kimlik doğrulama, kullanıcılar ve oturumlar için veri erişim katmanı.
 */

import { UserModel, type IUser } from '#modules/auth/user.model.js';
import { SessionModel, type ISession } from '#modules/auth/session.model.js';

export class AuthRepository {
  /**
   * Sistemde en az bir super admin kullanıcısı olup olmadığını denetler.
   */
  async hasSuperAdmin(): Promise<boolean> {
    const exists = await UserModel.exists({ role: 'superadmin' });
    return Boolean(exists);
  }

  /**
   * E-posta adresine göre kullanıcı arar.
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return await UserModel.findOne({ email: email.toLowerCase().trim() });
  }

  /**
   * ID değerine göre kullanıcı arar.
   */
  async findById(id: string): Promise<IUser | null> {
    return await UserModel.findById(id);
  }

  /**
   * Yeni kullanıcı oluşturur.
   */
  async createUser(data: {
    tenant_id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: 'superadmin' | 'tenant_admin' | 'user';
    is_active?: boolean;
  }): Promise<IUser> {
    return await UserModel.create({
      tenant_id: data.tenant_id,
      email: data.email.toLowerCase().trim(),
      password_hash: data.password_hash,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      role: data.role,
      is_active: data.is_active ?? true,
    });
  }

  /**
   * Yeni bir Opaque Token oturumu kaydeder.
   */
  async createSession(data: {
    tokenHash: string;
    userId: string;
    tenantId: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<ISession> {
    const sessionDoc: Record<string, unknown> = {
      token_hash: data.tokenHash,
      user_id: data.userId,
      tenant_id: data.tenantId,
      expires_at: data.expiresAt,
      last_active_at: new Date(),
    };
    if (data.ipAddress) sessionDoc.ip_address = data.ipAddress;
    if (data.userAgent) sessionDoc.user_agent = data.userAgent;

    return (await SessionModel.create(sessionDoc)) as unknown as ISession;
  }

  /**
   * Hashlenmiş token üzerinden aktif oturumu ve ilişkili kullanıcıyı getirir.
   */
  async findSessionWithUser(tokenHash: string): Promise<{ session: ISession; user: IUser } | null> {
    const session = await SessionModel.findOne({ token_hash: tokenHash });
    if (!session) {
      return null;
    }

    // Süresi dolmuşsa doğrudan null dön (TTL silene kadar güvenlik)
    if (new Date() > session.expires_at) {
      await SessionModel.deleteOne({ _id: session._id });
      return null;
    }

    const user = await UserModel.findById(session.user_id);
    if (!user) {
      return null;
    }

    return { session, user };
  }

  /**
   * Tekil bir oturumu siler (Logout).
   */
  async deleteSession(tokenHash: string): Promise<boolean> {
    const res = await SessionModel.deleteOne({ token_hash: tokenHash });
    return res.deletedCount > 0;
  }

  /**
   * Bir kullanıcının tüm oturumlarını sonlandırır (Tüm cihazlardan çıkış).
   */
  async deleteAllSessionsForUser(userId: string): Promise<number> {
    const res = await SessionModel.deleteMany({ user_id: userId });
    return res.deletedCount;
  }

  /**
   * Oturumun son aktivite zamanını günceller.
   */
  async touchSession(tokenHash: string): Promise<void> {
    await SessionModel.updateOne({ token_hash: tokenHash }, { $set: { last_active_at: new Date() } });
  }
}

export const authRepository = new AuthRepository();
