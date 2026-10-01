import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#app.js';
import { connectDatabase, disconnectDatabase } from '#shared/database/index.js';
import { PromptModel } from '#modules/prompt/prompt.model.js';
import { promptService } from '#modules/prompt/prompt.service.js';
import { ConversationModel } from '#modules/chat/conversation.model.js';

const TEST_TENANT = 'test-tenant-prompt';
const OTHER_TENANT = 'other-tenant-prompt';

describe('Prompt Yönetimi ve Stacking Motoru API (Prompt API)', () => {
  beforeAll(async () => {
    await connectDatabase();
    await PromptModel.deleteMany({ tenant_id: { $in: [TEST_TENANT, OTHER_TENANT] } });
    await ConversationModel.deleteMany({ tenant_id: TEST_TENANT });
  });

  afterAll(async () => {
    await PromptModel.deleteMany({ tenant_id: { $in: [TEST_TENANT, OTHER_TENANT] } });
    await ConversationModel.deleteMany({ tenant_id: TEST_TENANT });
    await disconnectDatabase();
  });

  let guardrailId: string;
  let personaId: string;

  it('POST /api/prompts yeni bir kurumsal guardrail promptu oluşturmalı (201)', async () => {
    const res = await request(app)
      .post('/api/prompts')
      .set('x-tenant-id', TEST_TENANT)
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
    expect(res.body.data.tenant_id).toBe(TEST_TENANT);

    guardrailId = res.body.data._id;
  });

  it('POST /api/prompts varsayılan uzmanlık personasi oluşturmalı (201)', async () => {
    const res = await request(app)
      .post('/api/prompts')
      .set('x-tenant-id', TEST_TENANT)
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
      .set('x-tenant-id', TEST_TENANT)
      .send({
        title: 'Tekrar Eden Slug',
        slug: 'sec-fin-01',
        type: 'custom',
        content: 'Aynı slug kabul edilemez.',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DOMAIN_ERROR');
  });

  it('GET /api/prompts kiracıya ait promptları listelemeli ve RLS izolasyonunu sağlamalıdır', async () => {
    // Başka bir tenant'a prompt ekle
    await request(app)
      .post('/api/prompts')
      .set('x-tenant-id', OTHER_TENANT)
      .send({
        title: 'Yabancı Tenant Kuralı',
        slug: 'foreign-rule',
        type: 'system_guardrail',
        content: 'Yabancı kurallar görünmemeli.',
      });

    const res = await request(app)
      .get('/api/prompts')
      .set('x-tenant-id', TEST_TENANT);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    // Yabancı tenant kuralı görünmemeli
    const slugs = res.body.data.map((p: any) => p.slug);
    expect(slugs).toContain('sec-fin-01');
    expect(slugs).toContain('tax-expert');
    expect(slugs).not.toContain('foreign-rule');
  });

  it('GET /api/prompts?type=persona filtrelemeyi doğru yapmalıdır', async () => {
    const res = await request(app)
      .get('/api/prompts?type=persona')
      .set('x-tenant-id', TEST_TENANT);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe('tax-expert');
  });

  it('GET /api/prompts/:id tekil prompt detayını getirmelidir', async () => {
    const res = await request(app)
      .get(`/api/prompts/${personaId}`)
      .set('x-tenant-id', TEST_TENANT);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(personaId);
    expect(res.body.data.title).toBe('Kıdemli Vergi Uzmanı');
  });

  it('PUT /api/prompts/:id içeriği ve aktifliği güncelleyebilmelidir', async () => {
    const res = await request(app)
      .put(`/api/prompts/${personaId}`)
      .set('x-tenant-id', TEST_TENANT)
      .send({
        title: 'Baş Danışman & Vergi Uzmanı',
        content: 'Sen uluslararası vergi hukuku ve denetim uzmanısın.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Baş Danışman & Vergi Uzmanı');
    expect(res.body.data.content).toBe('Sen uluslararası vergi hukuku ve denetim uzmanısın.');
  });

  it('Prompt Stacking Engine: Guardrails + Persona + Custom Instructions dinamik olarak birleştirilmelidir', async () => {
    const assembledPrompt = await promptService.buildSystemPrompt(TEST_TENANT, {
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

  it('POST /api/chat/sessions oturum oluştururken promptId ve customInstructions bağlanabilmelidir', async () => {
    const res = await request(app)
      .post('/api/chat/sessions')
      .set('x-tenant-id', TEST_TENANT)
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
      .set('x-tenant-id', TEST_TENANT);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app)
      .get(`/api/prompts/${guardrailId}`)
      .set('x-tenant-id', TEST_TENANT);
    expect(check.status).toBe(404);
  });
});
