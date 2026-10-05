import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#app.js';
import { connectDatabase, disconnectDatabase } from '#shared/database/index.js';
import { UserModel } from '#modules/auth/user.model.js';
import { SessionModel } from '#modules/auth/session.model.js';
import { RoleModel } from '#modules/role/role.model.js';
import { roleService } from '#modules/role/role.service.js';
import { PolicyEngine } from '#modules/role/policy.engine.js';
import { PERMISSIONS } from '#modules/role/role.types.js';

describe('Kurumsal RBAC, Arketip Tavanı ve Hiyerarşik Yetkilendirme Testleri', () => {
  let existingSuperAdmins: any[] = [];

  beforeAll(async () => {
    await connectDatabase();
    existingSuperAdmins = await UserModel.find({
      system_role: 'superadmin',
      email: { $ne: 'superadmin@test.local' },
    }).lean();

    if (existingSuperAdmins.length > 0) {
      await UserModel.deleteMany({
        _id: { $in: existingSuperAdmins.map((u) => u._id) },
      });
    }

    await UserModel.deleteMany({
      email: {
        $in: [
          'superadmin@test.local',
          'admin1@test.local',
          'user1@test.local',
          'user2@test.local',
          'delegated_admin@test.local',
        ],
      },
    });
    await SessionModel.deleteMany({});
    await roleService.initDefaultRoles();
  });

  afterAll(async () => {
    await UserModel.deleteMany({
      email: {
        $in: [
          'superadmin@test.local',
          'admin1@test.local',
          'user1@test.local',
          'user2@test.local',
          'delegated_admin@test.local',
        ],
      },
    });
    await RoleModel.deleteMany({ slug: { $in: ['compliance-auditor', 'test-invalid-user-role', 'custom-user-default'] } });
    await SessionModel.deleteMany({});

    if (existingSuperAdmins.length > 0) {
      await UserModel.insertMany(existingSuperAdmins);
    }

    await disconnectDatabase();
  });

  let superAdminToken: string;
  let superAdminId: string;
  let admin1Token: string;
  let admin1Id: string;
  let user1Token: string;
  let user1Id: string;

  it('1. İlk Kurulum: Tek Superadmin başarıyla oluşturulmalıdır', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({
        firstName: 'Süper',
        lastName: 'Yönetici',
        email: 'superadmin@test.local',
        password: 'SuperGucluSifre2026!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.systemRole).toBe('superadmin');
    expect(res.body.data.token).toBeDefined();

    superAdminToken = res.body.data.token;
    superAdminId = res.body.data.user.id;
  });

  it('2. Tek Superadmin Garantisi: İkinci bir superadmin oluşturulması engellenmelidir (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({
        firstName: 'İkinci',
        lastName: 'Yönetici',
        email: 'superadmin2@test.local',
        password: 'SuperGucluSifre2026!',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('3. Standart kullanıcı girişi ve token üretimi', async () => {
    const { hashPassword } = await import('#modules/auth/auth.utils.js');
    const passwordHash = await hashPassword('KullaniciSifre123!');
    const userDoc = await UserModel.create({
      first_name: 'Ahmet',
      last_name: 'Geliştirici',
      email: 'user1@test.local',
      password_hash: passwordHash,
      system_role: 'user',
      roles: ['developer'],
      is_active: true,
    });
    user1Id = (userDoc._id as any).toString();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user1@test.local',
        password: 'KullaniciSifre123!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();
    expect(loginRes.body.data.user.roles).toContain('developer');

    user1Token = loginRes.body.data.token;
  });

  it('4. Admin Atama Hiyerarşisi: Superadmin bir kullanıcıyı Admin yapabilmelidir', async () => {
    const { hashPassword } = await import('#modules/auth/auth.utils.js');
    const adminPasswordHash = await hashPassword('AdminSifre123!');
    const adminUser = await UserModel.create({
      first_name: 'Kemal',
      last_name: 'Yönetici',
      email: 'admin1@test.local',
      password_hash: adminPasswordHash,
      system_role: 'user',
      roles: [],
      is_active: true,
    });
    admin1Id = (adminUser._id as any).toString();

    const res = await request(app)
      .post('/api/auth/admin/assign')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ targetUserId: admin1Id });

    expect(res.status).toBe(200);
    expect(res.body.data.systemRole).toBe('admin');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin1@test.local',
        password: 'AdminSifre123!',
      });
    admin1Token = loginRes.body.data.token;
  });

  it('5. Admin Delegasyonu: Atama izni olmayan kullanıcı admin atayamaz (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/auth/admin/assign')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ targetUserId: user1Id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('6. Admin Dokunulmazlığı: Standart Admin kendi kendini veya Superadmini banlayamaz', async () => {
    const resSelf = await request(app)
      .post(`/api/auth/users/${admin1Id}/ban`)
      .set('Authorization', `Bearer ${admin1Token}`)
      .send({ reason: 'Kendi hesabını banlama' });
    expect(resSelf.status).toBe(422);

    const resSuper = await request(app)
      .post(`/api/auth/users/${superAdminId}/ban`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ reason: 'Superadmini banlama' });
    expect(resSuper.status).toBe(422);
  });

  it('7. Anlık Ban ve Oturum İptali (Session Invalidation)', async () => {
    const meBefore = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(meBefore.status).toBe(200);

    const banRes = await request(app)
      .post(`/api/auth/users/${user1Id}/ban`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ reason: 'Kurallara aykırı kullanım' });

    expect(banRes.status).toBe(200);
    expect(banRes.body.data.isActive).toBe(false);

    const meAfter = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(meAfter.status).toBe(401);
  });

  it('8. Banlı kullanıcının giriş yapması engellenmelidir (403 Forbidden)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user1@test.local',
        password: 'KullaniciSifre123!',
      });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('FORBIDDEN');
  });

  it('9. Yetki Tavanı Kuralı (Ceiling): user arketipindeki bir role admin: yetkisi eklenemez (422)', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        slug: 'test-invalid-user-role',
        name: 'Hatalı Rol',
        description: 'Tavan aşım testi',
        baseArchetype: 'user',
        permissions: [PERMISSIONS.ADMIN_USER_BAN],
      });

    expect(res.status).toBe(422);
  });

  it('10. Dinamik Rol Yönetimi: admin arketipinden yeni rol türetilmeli ve izinleri güncellenebilmelidir', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        slug: 'compliance-auditor',
        name: 'Uyum ve Denetim Uzmanı',
        description: 'Tüm denetim loglarını inceleme yetkisi',
        baseArchetype: 'admin',
        permissions: [PERMISSIONS.ADMIN_AUDIT_READ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('compliance-auditor');
    expect(res.body.data.permissions).toContain(PERMISSIONS.ADMIN_AUDIT_READ);

    const updateRes = await request(app)
      .put('/api/roles/compliance-auditor/permissions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        permissions: [PERMISSIONS.ADMIN_AUDIT_READ, PERMISSIONS.ADMIN_RAG_UPLOAD],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.permissions).toContain(PERMISSIONS.ADMIN_RAG_UPLOAD);
  });

  it('11. Varsayılan Rol Yönetimi: Admin yeni bir varsayılan kullanıcı rolü belirleyebilmelidir', async () => {
    // 1. Yeni bir user arketip rolü oluştur
    await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        slug: 'custom-user-default',
        name: 'Özel Varsayılan Rol',
        baseArchetype: 'user',
        permissions: [PERMISSIONS.USER_CHAT_CREATE, PERMISSIONS.USER_RAG_SEARCH],
      });

    // 2. Varsayılan yap
    const res = await request(app)
      .put('/api/roles/custom-user-default/set-default')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.is_default).toBe(true);

    // 3. Admin arketipindeki bir rol varsayılan yapılmak istendiğinde 422 hatası almalı
    const invalidDefaultRes = await request(app)
      .put('/api/roles/compliance-auditor/set-default')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(invalidDefaultRes.status).toBe(422);
  });

  it('12. Kullanıcı Spesifik Yetki Ezme (Override): Allow ve Deny öncelikleri doğrulanmalıdır', async () => {
    // user1'in banını kaldıralım
    await request(app)
      .post(`/api/auth/users/${user1Id}/unban`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    // user1'e özel ALLOW yetkisi verelim (örn: ADMIN_RAG_UPLOAD)
    const overrideRes = await request(app)
      .put(`/api/auth/users/${user1Id}/permissions/override`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        allow: [PERMISSIONS.ADMIN_RAG_UPLOAD],
        deny: [PERMISSIONS.USER_CHAT_CREATE],
      });

    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.data.customPermissions.allow).toContain(PERMISSIONS.ADMIN_RAG_UPLOAD);
    expect(overrideRes.body.data.customPermissions.deny).toContain(PERMISSIONS.USER_CHAT_CREATE);

    const updatedUser = await UserModel.findById(user1Id);
    // ALLOW sayesinde ADMIN_RAG_UPLOAD izni true olmalı
    expect(await PolicyEngine.can(updatedUser!, PERMISSIONS.ADMIN_RAG_UPLOAD)).toBe(true);
    // DENY sayesinde normalde rolünde olsa dahi USER_CHAT_CREATE false olmalı
    expect(await PolicyEngine.can(updatedUser!, PERMISSIONS.USER_CHAT_CREATE)).toBe(false);

    // Superadmin üzerinde override denenirse 403 Forbidden olmalı
    const superOverride = await request(app)
      .put(`/api/auth/users/${superAdminId}/permissions/override`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ allow: [], deny: [PERMISSIONS.USER_CHAT_CREATE] });

    expect(superOverride.status).toBe(403);
  });

  it('13. Rol Atama Yetkisi: admin:user:assign_role yetkisine sahip yönetici bir kullanıcıya system_admin rolü atayabilmelidir', async () => {
    const res = await request(app)
      .put(`/api/auth/users/${user1Id}/roles`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ roles: ['system_admin'] });

    expect(res.status).toBe(200);
    expect(res.body.data.roles).toContain('system_admin');

    // user1'i tekrar standart default_user rolüne geri al
    const revertRes = await request(app)
      .put(`/api/auth/users/${user1Id}/roles`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ roles: ['default_user'] });
    expect(revertRes.status).toBe(200);
  });

  it('14. Rol Delegasyon Denetimi: Yetkisi olmayan kullanıcı rol atayamaz (403), yetkili yönetici atayabilir (200)', async () => {
    // user1 için yeni token al (rol değişikliği oturumunu sonlandırmıştı)
    const user1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@test.local', password: 'KullaniciSifre123!' });
    const freshUserToken = user1Login.body.data.token;

    // user1'in izinlerinde admin:user:assign_role yok -> 403 Forbidden
    const forbiddenRes = await request(app)
      .put(`/api/auth/users/${user1Id}/roles`)
      .set('Authorization', `Bearer ${freshUserToken}`)
      .send({ roles: ['system_admin'] });

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');

    // admin1 (admin yetkilerine sahip) kullanıcıya rol atayabilir -> 200
    const successRes = await request(app)
      .put(`/api/auth/users/${user1Id}/roles`)
      .set('Authorization', `Bearer ${admin1Token}`)
      .send({ roles: ['default_user'] });

    expect(successRes.status).toBe(200);
    expect(successRes.body.data.roles).toContain('default_user');
  });

  it('15. İzin Ezme (Override) Yönetimi: admin:user:override yetkisine sahip yönetici başka bir kullanıcıya özel izin tanımlayabilir', async () => {
    const res = await request(app)
      .put(`/api/auth/users/${user1Id}/permissions/override`)
      .set('Authorization', `Bearer ${admin1Token}`)
      .send({ allow: [PERMISSIONS.ADMIN_MODEL_MANAGE], deny: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.customPermissions.allow).toContain(PERMISSIONS.ADMIN_MODEL_MANAGE);
  });

  it('16. Öz-Yetkilendirme Koruması: Bir yönetici kendi hesabına allow override ile izin ekleyemez (403)', async () => {
    const res = await request(app)
      .put(`/api/auth/users/${admin1Id}/permissions/override`)
      .set('Authorization', `Bearer ${admin1Token}`)
      .send({ allow: [PERMISSIONS.USER_MODEL_USE], deny: [] });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('Kendi hesabınıza doğrudan yetki');
  });
});
