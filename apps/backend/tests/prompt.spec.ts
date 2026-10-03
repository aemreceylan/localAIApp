import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '#app.js';
import { connectDatabase, disconnectDatabase } from '#shared/database/index.js';
import { PromptModel } from '#modules/prompt/prompt.model.js';
import { promptService } from '#modules/prompt/prompt.service.js';
import { ConversationModel } from '#modules/chat/conversation.model.js';
import { authService } from '#modules/auth/index.js';

describe('Prompt Yönetimi ve Stacking Motoru API (Prompt API)', () => {
  beforeAll(async () => {
    await connectDatabase();
    await PromptModel.deleteMany({ slug: { $in: ['sec-fin-01', 'tax-expert', 'hr-persona', 'dev-persona'] } });
    await ConversationModel.deleteMany({ title: 'Vergi Oturumu' });
  });

  afterAll(async () => {
    await PromptModel.deleteMany({ slug: { $in: ['sec-fin-01', 'tax-expert', 'hr-persona', 'dev-persona'] } });
    await ConversationModel.deleteMany({ title: 'Vergi Oturumu' });
    await disconnectDatabase();
  });

  beforeEach(() => {
    vi.spyOn(authService, 'validateToken').mockResolvedValue({
      user: {
        _id: '66f7d540e11893c5d808e9a1',
        email: 'superadmin@test.local',
        system_role: 'superadmin',
        roles: ['admin'],
        is_active: true,
      } as any,
      session: {} as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  let guardrailId: string;
  let personaId: string;

  it('Token olmadığında POST /api/prompts 401 UNAUTHORIZED dönmelidir', async () => {
    vi.restoreAllMocks();
    const res = await request(app)
      .post('/api/prompts')
      .send({
        title: 'Yetkisiz Prompt',
        slug: 'unauth-prompt',
        type: 'custom',
        content: 'Bu istek reddedilmelidir.',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/prompts yeni bir kurumsal guardrail promptu oluşturmalı (201)', async () => {
    const res = await request(app)
      .post('/api/prompts')
      .set('Authorization', 'Bearer nx_live_admin_token')
      .send({
        title: 'Finansal Gizlilik Kuralı',
        slug: 'sec-fin-01',
        type: 'system_guardrail',
        content: 'Müşteri kredi kartı ve hesap numarası bilgilerini asla ifşa etmeyiniz.',
        priority: 1,
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('sec-fin-01');
    expect(res.body.data.type).toBe('system_guardrail');
    expect(res.body.data.allowed_roles).toEqual(['*']);

    guardrailId = res.body.data._id;
  });

  it('POST /api/prompts varsayılan uzmanlık personasi oluşturmalı (201)', async () => {
    const res = await request(app)
      .post('/api/prompts')
      .set('Authorization', 'Bearer nx_live_admin_token')
      .send({
        title: 'Kıdemli Vergi Uzmanı',
        slug: 'tax-expert',
        type: 'persona',
        content: 'Sen Türkiye vergi mevzuatında 20 yıl deneyimli kıdemli bir mali müşavirsin.',
        isDefault: true,
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('tax-expert');
    expect(res.body.data.is_default).toBe(true);

    personaId = res.body.data._id;
  });

  it('POST /api/prompts aynı slug ile kayıt oluşturulmak istendiğinde 400 DOMAIN_ERROR dönmelidir', async () => {
    const res = await request(app)
      .post('/api/prompts')
      .set('Authorization', 'Bearer nx_live_admin_token')
      .send({
        title: 'Tekrar Eden Slug',
        slug: 'sec-fin-01',
        type: 'custom',
        content: 'Aynı slug kabul edilemez.',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DOMAIN_ERROR');
  });

  it('GET /api/prompts promptları listelemelidir', async () => {
    const res = await request(app)
      .get('/api/prompts')
      .set('Authorization', 'Bearer nx_live_admin_token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    const slugs = res.body.data.map((p: any) => p.slug);
    expect(slugs).toContain('sec-fin-01');
    expect(slugs).toContain('tax-expert');
  });

  it('GET /api/prompts?type=persona filtrelemeyi doğru yapmalıdır', async () => {
    const res = await request(app)
      .get('/api/prompts?type=persona')
      .set('Authorization', 'Bearer nx_live_admin_token');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((p: any) => p.slug === 'tax-expert')).toBe(true);
  });

  it('GET /api/prompts/:id tekil prompt detayını getirmelidir', async () => {
    const res = await request(app)
      .get(`/api/prompts/${personaId}`)
      .set('Authorization', 'Bearer nx_live_admin_token');

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(personaId);
    expect(res.body.data.title).toBe('Kıdemli Vergi Uzmanı');
  });

  it('PUT /api/prompts/:id içeriği ve aktifliği güncelleyebilmelidir', async () => {
    const res = await request(app)
      .put(`/api/prompts/${personaId}`)
      .set('Authorization', 'Bearer nx_live_admin_token')
      .send({
        title: 'Baş Danışman & Vergi Uzmanı',
        content: 'Sen uluslararası vergi hukuku ve denetim uzmanısın.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Baş Danışman & Vergi Uzmanı');
    expect(res.body.data.content).toBe('Sen uluslararası vergi hukuku ve denetim uzmanısın.');
  });

  it('Prompt Stacking Engine: Guardrails + Persona + Custom Instructions dinamik olarak birleştirilmelidir', async () => {
    const assembledPrompt = await promptService.buildSystemPrompt({
      prompt_id: personaId,
      custom_instructions: 'Yanıtları maddeler halinde sun.',
    });

    expect(assembledPrompt).toBeDefined();
    // 1. Katman Kurumsal Guardrail
    expect(assembledPrompt).toContain('=== [KURUMSAL GÜVENLİK VE POLİTİKA KURALLARI] ===');
    expect(assembledPrompt).toContain('Müşteri kredi kartı ve hesap numarası bilgilerini asla ifşa etmeyiniz.');
    // 2. Katman Persona (Güncel hali)
    expect(assembledPrompt).toContain('=== [UZMANLIK VE ROL TALİMATI] ===');
    expect(assembledPrompt).toContain('Sen uluslararası vergi hukuku ve denetim uzmanısın.');
    // 3. Katman Özel Talimat
    expect(assembledPrompt).toContain('=== [KULLANICI EK TALİMATI] ===');
    expect(assembledPrompt).toContain('Yanıtları maddeler halinde sun.');
  });

  it('Rol Bazlı Prompt İzolasyonu: Yalnızca İK rolüne açık persona, Yazılımcı sorgusunda dönmemelidir', async () => {
    // İK'ya özel prompt oluştur
    await promptService.createPrompt({
      title: 'İK İşe Alım Asistanı',
      slug: 'hr-persona',
      type: 'persona',
      content: 'İK mülakat soruları hazırla.',
      allowedRoles: ['hr'],
    });

    // Yazılımcı rolü ile filtrele
    const devPrompts = await promptService.getPrompts({ roles: ['developer'] });
    const devSlugs = devPrompts.map((p) => p.slug);
    expect(devSlugs).not.toContain('hr-persona');

    // İK rolü ile filtrele
    const hrPrompts = await promptService.getPrompts({ roles: ['hr'] });
    const hrSlugs = hrPrompts.map((p) => p.slug);
    expect(hrSlugs).toContain('hr-persona');
  });

  it('POST /api/chat/sessions oturum oluştururken promptId ve customInstructions bağlanabilmelidir', async () => {
    const res = await request(app)
      .post('/api/chat/sessions')
      .set('Authorization', 'Bearer nx_live_admin_token')
      .send({
        title: 'Vergi Oturumu',
        model: 'llama3.2:3b',
        promptId: personaId,
        customInstructions: 'Kısa ve net ol.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.prompt_id).toBe(personaId);
    expect(res.body.data.custom_instructions).toBe('Kısa ve net ol.');
  });

  it('DELETE /api/prompts/:id promptu başarıyla silmelidir', async () => {
    const res = await request(app)
      .delete(`/api/prompts/${guardrailId}`)
      .set('Authorization', 'Bearer nx_live_admin_token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app)
      .get(`/api/prompts/${guardrailId}`)
      .set('Authorization', 'Bearer nx_live_admin_token');
    expect(check.status).toBe(404);
  });
});
