import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#app.js';
import { connectDatabase, disconnectDatabase } from '#shared/database/index.js';
import { UserModel } from '#modules/auth/user.model.js';
import { SessionModel } from '#modules/auth/session.model.js';
import { InvitationModel } from '#modules/auth/invitation.model.js';
import { roleService } from '#modules/role/role.service.js';

describe('Kullanıcı Kaydı, Onay Süreci ve Davet Kodu (Onboarding & Invitation) API Testleri', () => {
  let existingSuperAdmins: any[] = [];
  let superAdminToken: string;

  const testEmails = [
    'super_onboard@test.local',
    'pending_user@test.local',
    'rejected_user@test.local',
    'invitee_user@test.local',
    'exhausted_invitee@test.local',
  ];

  beforeAll(async () => {
    await connectDatabase();

    existingSuperAdmins = await UserModel.find({
      system_role: 'superadmin',
      email: { $nin: testEmails },
    }).lean();

    if (existingSuperAdmins.length > 0) {
      await UserModel.deleteMany({
        _id: { $in: existingSuperAdmins.map((u) => u._id) },
      });
    }

    await UserModel.deleteMany({ email: { $in: testEmails } });
    await SessionModel.deleteMany({});
    await InvitationModel.deleteMany({});
    await roleService.initDefaultRoles();

    // 1. Kurulum Super Admin oluştur
    const setupRes = await request(app)
      .post('/api/auth/setup')
      .send({
        email: 'super_onboard@test.local',
        password: 'SuperPassword123!',
        firstName: 'Super',
        lastName: 'Admin',
      });

    expect(setupRes.status).toBe(201);
    superAdminToken = setupRes.body.data.token;
  });

  afterAll(async () => {
    await UserModel.deleteMany({ email: { $in: testEmails } });
    await SessionModel.deleteMany({});
    await InvitationModel.deleteMany({});

    if (existingSuperAdmins.length > 0) {
      await UserModel.insertMany(existingSuperAdmins);
    }

    await disconnectDatabase();
  });

  let pendingUserId: string;

  it('1. Davetiye kodu olmadan açık kayıt: Kullanıcı pending_approval statüsünde açılmalı ve token dönmemelidir', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'pending_user@test.local',
        password: 'Password123!',
        firstName: 'Bekleyen',
        lastName: 'Personel',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPendingApproval).toBe(true);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.user.status).toBe('pending_approval');
    expect(res.body.data.user.isActive).toBe(false);

    pendingUserId = res.body.data.user.id;
  });

  it('2. Onay bekleyen kullanıcı giriş yapmaya çalıştığında 403 Forbidden dönmeli ve bilgi mesajı içermelidir', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pending_user@test.local',
        password: 'Password123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('onaylanmamıştır');
  });

  it('3. GET /api/auth/users/pending yetkili admin tarafından onay bekleyen personelleri listelemelidir', async () => {
    const res = await request(app)
      .get('/api/auth/users/pending')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((u: any) => u.email === 'pending_user@test.local');
    expect(found).toBeDefined();
    expect(found.status).toBe('pending_approval');
  });

  it('4. POST /api/auth/users/:id/approve bekleyen kullanıcıyı onaylamalı ve fonksiyonel rollerini atamalıdır', async () => {
    const res = await request(app)
      .post(`/api/auth/users/${pendingUserId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        roles: ['developer'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.roles).toContain('developer');
  });

  it('5. Onaylanan kullanıcı artık başarıyla login olabilmelidir', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pending_user@test.local',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.status).toBe('active');
  });

  let createdInviteCode: string;

  it('6. POST /api/auth/invitations ile süreli ve kullanımlı davet kodu üretilmelidir', async () => {
    const res = await request(app)
      .post('/api/auth/invitations')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        assignedRoles: ['developer'],
        maxUses: 1,
        expiresInHours: 48,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toMatch(/^nx_inv_/);
    expect(res.body.data.maxUses).toBe(1);
    expect(res.body.data.usedCount).toBe(0);

    createdInviteCode = res.body.data.code;
  });

  it('7. GET /api/auth/invitations aktif davet kodlarını listelemelidir', async () => {
    const res = await request(app)
      .get('/api/auth/invitations')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const found = res.body.data.find((i: any) => i.code === createdInviteCode);
    expect(found).toBeDefined();
    expect(found.isExpired).toBe(false);
  });

  it('8. Davet kodu ile kayıt olan kullanıcı anında aktif olmalı, rollerini almalı ve session token dönmelidir', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invitee_user@test.local',
        password: 'Password123!',
        firstName: 'Davetli',
        lastName: 'Kullanıcı',
        inviteCode: createdInviteCode,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPendingApproval).toBe(false);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.status).toBe('active');
    expect(res.body.data.user.roles).toContain('developer');

    // Cookie denetimi
    const rawCookies = res.headers['set-cookie'];
    const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    const hasNexusSession = cookies.some((c: string) => c.includes('nexus_session='));
    expect(hasNexusSession).toBe(true);
  });

  it('9. Tek kullanımlık davet kodu limiti dolduğunda tekrar kayıt denemesi 400 hatası vermelidir', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'exhausted_invitee@test.local',
        password: 'Password123!',
        firstName: 'Geçersiz',
        lastName: 'Kullanıcı',
        inviteCode: createdInviteCode,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('maksimum kullanım adedine ulaşmıştır');
  });

  it('10. Kullanıcı kayıt başvurusunun reddedilmesi (POST /api/auth/users/:id/reject)', async () => {
    // Önce yeni bir bekleyen kullanıcı kaydet
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'rejected_user@test.local',
        password: 'Password123!',
        firstName: 'Reddedilecek',
        lastName: 'Kullanıcı',
      });
    expect(regRes.status).toBe(201);
    const rejectedUserId = regRes.body.data.user.id;

    // Admin tarafından reddet
    const rejectRes = await request(app)
      .post(`/api/auth/users/${rejectedUserId}/reject`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        reason: 'Kurumsal e-posta kriterine uymuyor.',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('rejected');

    // Reddedilen kullanıcının login denemesi 403 dönmeli
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'rejected_user@test.local',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.message).toContain('reddedilmiştir');
  });

  it('11. DELETE /api/auth/invitations/:code davet kodunu başarıyla iptal etmelidir', async () => {
    // Yeni bir davetiye oluştur
    const createRes = await request(app)
      .post('/api/auth/invitations')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        assignedRoles: ['developer'],
        maxUses: 5,
        expiresInHours: 24,
      });
    const codeToRevoke = createRes.body.data.code;

    // İptal et
    const deleteRes = await request(app)
      .delete(`/api/auth/invitations/${codeToRevoke}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Tekrar listelendiğinde bulunmamalı
    const listRes = await request(app)
      .get('/api/auth/invitations')
      .set('Authorization', `Bearer ${superAdminToken}`);

    const found = listRes.body.data.find((i: any) => i.code === codeToRevoke);
    expect(found).toBeUndefined();
  });
});
