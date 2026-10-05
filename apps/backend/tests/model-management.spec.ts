import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#app.js';
import { connectDatabase, disconnectDatabase } from '#shared/database/index.js';
import { UserModel } from '#modules/auth/user.model.js';
import { SessionModel } from '#modules/auth/session.model.js';
import { roleService } from '#modules/role/role.service.js';

describe('Admin Model Yönetimi ve İndirme API Testleri', () => {
  let existingSuperAdmins: any[] = [];
  let superAdminToken: string;

  const testEmails = ['super_model_mgmt@test.local'];

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
    await roleService.initDefaultRoles();

    // 1. Super Admin oluştur
    const setupRes = await request(app)
      .post('/api/auth/setup')
      .send({
        email: 'super_model_mgmt@test.local',
        password: 'SuperPassword123!',
        firstName: 'Model',
        lastName: 'Admin',
      });
    superAdminToken = setupRes.body.data.token;
  });

  afterAll(async () => {
    await UserModel.deleteMany({ email: { $in: testEmails } });
    await SessionModel.deleteMany({});

    if (existingSuperAdmins.length > 0) {
      await UserModel.insertMany(existingSuperAdmins);
    }

    await disconnectDatabase();
  });

  it('1. GET /api/admin/models yetkisiz erişimde 401 dönmelidir', async () => {
    const res = await request(app).get('/api/admin/models');
    expect(res.status).toBe(401);
  });

  it('2. GET /api/admin/models yetkili Super Admin için modelleri ve varsayılan modeli listelemelidir', async () => {
    const res = await request(app)
      .get('/api/admin/models')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('models');
    expect(Array.isArray(res.body.data.models)).toBe(true);
  });

  it('3. POST /api/admin/models/default modelId belirtilmediğinde 422 dönmelidir', async () => {
    const res = await request(app)
      .post('/api/admin/models/default')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('4. POST /api/admin/models/default sistemde kurulu olmayan bir model belirtildiğinde 404 dönmelidir', async () => {
    const res = await request(app)
      .post('/api/admin/models/default')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ modelId: 'non-existent-model:999b' });

    expect(res.status).toBe(404);
  });

  it('5. POST /api/admin/models/pull modelName eksik olduğunda 422 dönmelidir', async () => {
    const res = await request(app)
      .post('/api/admin/models/pull')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('6. POST /api/admin/models/pull geçerli model adı verildiğinde SSE akışı başlatmalıdır', async () => {
    const res = await request(app)
      .post('/api/admin/models/pull')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ modelName: 'test-model:latest' });

    expect(res.headers['content-type']).toContain('text/event-stream');
  });
});
