/**
 * @file auth.repository.ts
 * @description Kimlik doğrulama, kullanıcılar ve oturumlar için veri erişim katmanı.
 */

import { UserModel, type IUser, type SystemRole, type UserStatus } from '#modules/auth/user.model.js';
import { SessionModel, type ISession } from '#modules/auth/session.model.js';
import { InvitationModel, type IInvitation } from '#modules/auth/invitation.model.js';

export class AuthRepository {
  /**
   * Sistemde en az bir super admin kullanıcısı olup olmadığını denetler.
   * Geriye dönük uyumluluk: Hem yeni system_role hem de eski role alanını kontrol eder.
   */
  async hasSuperAdmin(): Promise<boolean> {
    const exists = await UserModel.exists({
      $or: [{ system_role: 'superadmin' }, { role: 'superadmin' as any }],
    });
    return Boolean(exists);
  }

  /**
   * Sistemdeki mevcut Super Admin kullanıcısını getirir.
   */
  async findSuperAdmin(): Promise<IUser | null> {
    return await UserModel.findOne({
      $or: [{ system_role: 'superadmin' }, { role: 'superadmin' as any }],
    }).lean<IUser>();
  }

  /**
   * E-posta adresine göre kullanıcı arar.
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return await UserModel.findOne({ email: email.toLowerCase().trim() }).lean<IUser>();
  }

  /**
   * ID değerine göre kullanıcı arar.
   */
  async findById(id: string): Promise<IUser | null> {
    return await UserModel.findById(id).lean<IUser>();
  }

  /**
   * Tüm kullanıcıları listeler.
   */
  async findAllUsers(): Promise<IUser[]> {
    return await UserModel.find().sort({ created_at: -1 }).lean<IUser[]>();
  }

  /**
   * Yeni kullanıcı oluşturur.
   */
  async createUser(data: {
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    system_role?: SystemRole;
    roles?: string[];
    is_active?: boolean;
    status?: UserStatus;
  }): Promise<IUser> {
    const isExplicitActive = data.is_active !== undefined ? data.is_active : (data.status ? data.status === 'active' : true);
    const resolvedStatus: UserStatus = data.status ?? (isExplicitActive ? 'active' : 'banned');

    return await UserModel.create({
      email: data.email.toLowerCase().trim(),
      password_hash: data.password_hash,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      system_role: data.system_role ?? 'user',
      roles: data.roles ?? [],
      is_active: isExplicitActive,
      status: resolvedStatus,
    });
  }

  /**
   * Onay bekleyen kullanıcıları listeler.
   */
  async findPendingUsers(): Promise<IUser[]> {
    return await UserModel.find({ status: 'pending_approval' }).sort({ created_at: -1 }).lean<IUser[]>();
  }

  /**
   * Kullanıcının onay durumunu günceller (Onayla veya Reddet).
   */
  async updateUserApproval(
    id: string,
    status: 'active' | 'rejected',
    roles?: string[]
  ): Promise<IUser | null> {
    const updateDoc: Record<string, any> = {
      status,
      is_active: status === 'active',
    };
    if (roles !== undefined) {
      updateDoc['roles'] = roles;
    }

    return await UserModel.findByIdAndUpdate(
      id,
      { $set: updateDoc },
      { returnDocument: 'after', runValidators: true }
    ).lean<IUser>();
  }

  /**
   * Kullanıcı alanlarını günceller.
   */
  async updateUser(id: string, update: Partial<IUser>): Promise<IUser | null> {
    return await UserModel.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' });
  }

  /**
   * Kullanıcının sistem rolünü günceller.
   */
  async updateUserSystemRole(id: string, systemRole: SystemRole): Promise<IUser | null> {
    return await UserModel.findByIdAndUpdate(
      id,
      { $set: { system_role: systemRole } },
      { returnDocument: 'after' }
    );
  }

  /**
   * Kullanıcının departman/fonksiyonel rollerini günceller.
   */
  async updateUserRoles(id: string, roles: string[]): Promise<IUser | null> {
    return await UserModel.findByIdAndUpdate(
      id,
      { $set: { roles } },
      { returnDocument: 'after' }
    );
  }

  /**
   * Kullanıcı bazlı istisnai izinleri (allow/deny override) günceller.
   */
  async updateCustomPermissions(
    id: string,
    customPermissions: { allow: string[]; deny: string[] }
  ): Promise<IUser | null> {
    return await UserModel.findByIdAndUpdate(
      id,
      { $set: { custom_permissions: customPermissions } },
      { returnDocument: 'after' }
    );
  }

  /**
   * Kullanıcı aktiflik/ban durumunu günceller.
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<IUser | null> {
    return await UserModel.findByIdAndUpdate(
      id,
      { $set: { is_active: isActive } },
      { returnDocument: 'after' }
    );
  }

  /**
   * Yeni bir Opaque Token oturumu kaydeder.
   */
  async createSession(data: {
    tokenHash: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<ISession> {
    const sessionDoc: Record<string, unknown> = {
      token_hash: data.tokenHash,
      user_id: data.userId,
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
    const session = await SessionModel.findOne({ token_hash: tokenHash }).lean<ISession>();
    if (!session) {
      return null;
    }

    // Süresi dolmuşsa doğrudan sil ve null dön (TTL temizliğine ek anlık garanti)
    if (new Date() > new Date(session.expires_at)) {
      await SessionModel.deleteOne({ _id: (session as any)._id });
      return null;
    }

    const user = await UserModel.findById(session.user_id).lean<IUser>();
    if (!user) {
      return null;
    }

    return { session, user };
  }

  /**
   * Kullanıcıya ait tüm aktif oturumları döner.
   */
  async findSessionsByUserId(userId: string): Promise<ISession[]> {
    return await SessionModel.find({ user_id: userId }).lean<ISession[]>();
  }

  /**
   * Tekil bir oturumu siler (Logout).
   */
  async deleteSession(tokenHash: string): Promise<boolean> {
    const res = await SessionModel.deleteOne({ token_hash: tokenHash });
    return res.deletedCount > 0;
  }

  /**
   * Bir kullanıcının tüm oturumlarını sonlandırır (Ban veya rol değişikliğinde anında oturum iptali).
   */
  async deleteAllSessionsForUser(userId: string): Promise<number> {
    const res = await SessionModel.deleteMany({ user_id: userId });
    return res.deletedCount;
  }

  /**
   * Oturumun son aktivite zamanını günceller.
   */
  async touchSession(tokenHash: string): Promise<void> {
    await SessionModel.updateOne(
      { token_hash: tokenHash },
      { $set: { last_active_at: new Date() } }
    );
  }

  /**
   * Yeni bir davet kodu oluşturur.
   */
  async createInvitation(data: {
    code: string;
    assigned_roles: string[];
    max_uses: number;
    expires_at: Date;
    created_by: string;
  }): Promise<IInvitation> {
    return await InvitationModel.create(data);
  }

  /**
   * Davet koduna göre geçerli davetiye kaydını arar.
   */
  async findInvitationByCode(code: string): Promise<IInvitation | null> {
    return await InvitationModel.findOne({ code: code.trim() });
  }

  /**
   * Davetiyenin kullanım adedini artırır.
   */
  async incrementInvitationUses(id: string): Promise<IInvitation | null> {
    return await InvitationModel.findByIdAndUpdate(
      id,
      { $inc: { used_count: 1 } },
      { returnDocument: 'after' }
    );
  }

  /**
   * Tüm davetiyeleri listeler.
   */
  async findAllInvitations(): Promise<IInvitation[]> {
    return await InvitationModel.find().sort({ created_at: -1 }).populate('created_by', 'email first_name last_name').lean<IInvitation[]>();
  }

  /**
   * Davetiyeyi siler (iptal eder).
   */
  async deleteInvitation(code: string): Promise<boolean> {
    const res = await InvitationModel.deleteOne({ code: code.trim() });
    return res.deletedCount > 0;
  }
}

export const authRepository = new AuthRepository();
