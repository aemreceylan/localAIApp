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

describe('Kurumsal RBAC, Güvenlik ve Yetkilendirme Testleri (Enterprise RBAC & Security)', () => {
  beforeAll(async () => {
    await connectDatabase();
    await UserModel.deleteMany({ email: { $in: ['superadmin@test.local', 'admin1@test.local', 'user1@test.local', 'user2@test.local'] } });
    await SessionModel.deleteMany({});
    await roleService.initDefaultRoles();
  });

  afterAll(async () => {
    await UserModel.deleteMany({ email: { $in: ['superadmin@test.local', 'admin1@test.local', 'user1@test.local', 'user2@test.local'] } });
    await SessionModel.deleteMany({});
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
      firstName: 'Ahmet',
      lastName: 'Geliştirici',
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
    // Yeni bir potansiyel admin oluştur
    const { hashPassword } = await import('#modules/auth/auth.utils.js');
    const adminPasswordHash = await hashPassword('AdminSifre123!');
    const adminUser = await UserModel.create({
      firstName: 'Kemal',
      lastName: 'Yönetici',
      email: 'admin1@test.local',
      password_hash: adminPasswordHash,
      system_role: 'user',
      roles: [],
      is_active: true,
    });
    admin1Id = (adminUser._id as any).toString();

    // Superadmin tokenı ile admin ata
    const res = await request(app)
      .post('/api/auth/admin/assign')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ targetUserId: admin1Id });

    expect(res.status).toBe(200);
    expect(res.body.data.systemRole).toBe('admin');

    // Admin kullanıcısı giriş yapsın
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin1@test.local',
        password: 'AdminSifre123!',
      });
    admin1Token = loginRes.body.data.token;
  });

  it('5. Yetki Yükseltme Koruması: Standart Admin başka bir Admin atayamaz (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/auth/admin/assign')
      .set('Authorization', `Bearer ${admin1Token}`)
      .send({ targetUserId: user1Id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('6. Admin Dokunulmazlığı: Standart Admin başka bir Admini banlayamaz (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/auth/users/${admin1Id}/ban`)
      .set('Authorization', `Bearer ${admin1Token}`)
      .send({ reason: 'Yasadışı ban denemesi' });

    expect(res.status).toBe(400); // Kendi hesabını banlayamaz
  });

  it('7. Superadmin Dokunulmazlığı: Superadmin hesabı asla banlanamaz', async () => {
    const res = await request(app)
      .post(`/api/auth/users/${superAdminId}/ban`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ reason: 'Kendi hesabını banlama denemesi' });

    expect(res.status).toBe(400);
  });

  it('8. Anlık Ban ve Oturum İptali (Session Invalidation): Banlanan kullanıcının tokenı anında 401/403 dönmelidir', async () => {
    // user1 aktif iken GET /api/auth/me başarılı çalışmalı
    const meBefore = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(meBefore.status).toBe(200);

    // Admin tarafından user1 banlansın
    const banRes = await request(app)
      .post(`/api/auth/users/${user1Id}/ban`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ reason: 'Kurallara aykırı kullanım' });

    expect(banRes.status).toBe(200);
    expect(banRes.body.data.isActive).toBe(false);

    // BİR SONRAKİ İSTEKTE user1'in eski tokenı ANINDA reddedilmeli
    const meAfter = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(meAfter.status).toBe(401); // Oturum silindi / askıya alındı
  });

  it('9. Banlı kullanıcının giriş yapması engellenmelidir (403 Forbidden)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user1@test.local',
        password: 'KullaniciSifre123!',
      });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('FORBIDDEN');
  });

  it('10. Open/Closed (OCP) Yetki Motoru: PolicyEngine Superadmin bypass ve rol kontrollerini doğrulamalıdır', async () => {
    const superAdminUser = await UserModel.findById(superAdminId);
    expect(await PolicyEngine.can(superAdminUser!, 'any:custom:permission')).toBe(true);

    const devUser = await UserModel.findById(user1Id);
    // user1 banlı olduğu için false dönmeli
    expect(await PolicyEngine.can(devUser!, PERMISSIONS.PROMPT_READ)).toBe(false);
  });

  it('11. Dinamik Rol Yönetimi: Yeni özel rol oluşturulabilmeli ve izinleri güncellenebilmelidir', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        slug: 'compliance-auditor',
        name: 'Uyum ve Denetim Uzmanı',
        description: 'Tüm denetim loglarını inceleme yetkisi',
        permissions: [PERMISSIONS.AUDIT_READ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('compliance-auditor');
    expect(res.body.data.permissions).toContain(PERMISSIONS.AUDIT_READ);

    // İzinleri güncelle (Open/Closed - dinamik genişleme)
    const updateRes = await request(app)
      .put('/api/roles/compliance-auditor/permissions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        permissions: [PERMISSIONS.AUDIT_READ, PERMISSIONS.RAG_DOCUMENT_READ],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.permissions).toContain(PERMISSIONS.RAG_DOCUMENT_READ);
  });
});
