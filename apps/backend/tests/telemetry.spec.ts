import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#app.js';
import { connectDatabase, disconnectDatabase } from '#shared/database/index.js';
import { UserModel } from '#modules/auth/user.model.js';
import { SessionModel } from '#modules/auth/session.model.js';
import { AiUsageLogModel } from '#modules/telemetry/ai-usage.model.js';
import { telemetryService } from '#modules/telemetry/telemetry.service.js';
import { roleService } from '#modules/role/role.service.js';

describe('Admin Telemetri, Performans ve Sistem Sağlığı Metrikleri Testleri', () => {
  let existingSuperAdmins: any[] = [];
  let superAdminToken: string;

  const testEmails = ['super_telemetry@test.local', 'user_telemetry@test.local'];

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
    await AiUsageLogModel.deleteMany({});
    await roleService.initDefaultRoles();

    // 1. Super Admin oluştur
    const setupRes = await request(app)
      .post('/api/auth/setup')
      .send({
        email: 'super_telemetry@test.local',
        password: 'SuperPassword123!',
        firstName: 'Telemetry',
        lastName: 'Admin',
      });
    superAdminToken = setupRes.body.data.token;

    // 2. Normal kullanıcı oluştur (Doğrudan aktif)
    await UserModel.create({
      email: 'user_telemetry@test.local',
      password_hash: 'dummy_hash',
      first_name: 'Regular',
      last_name: 'User',
      system_role: 'user',
      roles: ['default_user'],
      is_active: true,
      status: 'active',
    });
  });

  afterAll(async () => {
    await UserModel.deleteMany({ email: { $in: testEmails } });
    await SessionModel.deleteMany({});
    await AiUsageLogModel.deleteMany({});

    if (existingSuperAdmins.length > 0) {
      await UserModel.insertMany(existingSuperAdmins);
    }

    await disconnectDatabase();
  });

  it('1. TelemetryService.recordHttpRequest HTTP isteklerini ve gecikmelerini sepete kaydetmelidir', () => {
    telemetryService.recordHttpRequest(200, 45);
    telemetryService.recordHttpRequest(201, 60);
    telemetryService.recordHttpRequest(404, 15);
    telemetryService.recordHttpRequest(500, 120);

    const metrics = telemetryService.getHttpMetrics(60);
    expect(metrics.totalRequests).toBeGreaterThanOrEqual(4);
    expect(metrics.statusCodes['2xx']).toBeGreaterThanOrEqual(2);
    expect(metrics.statusCodes['4xx']).toBeGreaterThanOrEqual(1);
    expect(metrics.statusCodes['5xx']).toBeGreaterThanOrEqual(1);
    expect(metrics.avgLatencyMs).toBeGreaterThan(0);
    expect(metrics.p95LatencyMs).toBeGreaterThan(0);
  });

  it('2. TelemetryService.recordLlmUsage ve getLlmMetrics AI kullanım kayıtlarını derlemelidir', async () => {
    await telemetryService.recordLlmUsage({
      model: 'llama3.2:3b',
      provider: 'ollama',
      promptTokens: 150,
      completionTokens: 85,
      totalTokens: 235,
      durationMs: 850,
      ttftMs: 120,
      status: 'success',
    });

    await telemetryService.recordLlmUsage({
      model: 'qwen2.5:7b',
      provider: 'ollama',
      promptTokens: 200,
      completionTokens: 120,
      totalTokens: 320,
      durationMs: 1400,
      ttftMs: 250,
      status: 'success',
    });

    const llmMetrics = await telemetryService.getLlmMetrics(24);
    expect(llmMetrics.totalInvocations).toBe(2);
    expect(llmMetrics.successfulInvocations).toBe(2);
    expect(llmMetrics.totalTokens).toBe(555);
    expect(llmMetrics.totalPromptTokens).toBe(350);
    expect(llmMetrics.totalCompletionTokens).toBe(205);
    expect(llmMetrics.avgDurationMs).toBeGreaterThan(0);
    expect(llmMetrics.modelBreakdown.length).toBe(2);
  });

  it('3. TelemetryService.getSystemMetrics bellek, CPU ve sistem sağlık verilerini dönmelidir', async () => {
    const sys = await telemetryService.getSystemMetrics();
    expect(sys.process.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(sys.process.heapUsedMb).toBeGreaterThan(0);
    expect(sys.system.totalMemoryMb).toBeGreaterThan(0);
    expect(sys.system.cpuCores).toBeGreaterThan(0);
    expect(sys.process.eventLoopLagMs).toBeGreaterThanOrEqual(0);
  });

  it('4. GET /api/admin/metrics/overview yetkisiz istekte 401 dönmelidir', async () => {
    const res = await request(app).get('/api/admin/metrics/overview');
    expect(res.status).toBe(401);
  });

  it('5. GET /api/admin/metrics/overview yetkili Superadmin için 200 dönmeli ve konsolide özet içermelidir', async () => {
    const res = await request(app)
      .get('/api/admin/metrics/overview')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('system');
    expect(res.body.data).toHaveProperty('httpSummary');
    expect(res.body.data).toHaveProperty('llmSummary');
    expect(res.body.data.system.process).toHaveProperty('heapUsedMb');
    expect(res.body.data.llmSummary.totalTokens).toBe(555);
  });

  it('6. GET /api/admin/metrics/http HTTP trafik dökümünü dönmelidir', async () => {
    const res = await request(app)
      .get('/api/admin/metrics/http?minutes=30')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.timeWindowMinutes).toBe(30);
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
  });

  it('7. GET /api/admin/metrics/llm LLM kullanım metriklerini dönmelidir', async () => {
    const res = await request(app)
      .get('/api/admin/metrics/llm?hours=12')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalInvocations).toBe(2);
    expect(res.body.data.modelBreakdown[0]).toHaveProperty('model');
  });

  it('8. GET /api/admin/metrics/system donanım ve proses metriklerini dönmelidir', async () => {
    const res = await request(app)
      .get('/api/admin/metrics/system')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.system).toHaveProperty('memoryUsagePercent');
  });
});
