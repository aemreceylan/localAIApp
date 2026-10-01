import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/app.js';
import { saveOpenApiDocument } from '@/config/openapi.config.js';

describe('OpenAPI & Swagger Dokümantasyon Testleri', () => {
  it('GET /api/docs.json geçerli OpenAPI 3.0 şeması döndürmelidir', async () => {
    const res = await request(app).get('/api/docs.json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body).toHaveProperty('openapi', '3.0.0');
    expect(res.body.info).toHaveProperty('title', 'NexusAI Gateway & Knowledge Base API');
    expect(res.body.paths).toHaveProperty('/health');
    expect(res.body.paths).toHaveProperty('/api/chat');
    expect(res.body.paths['/api/chat'].post.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'x-tenant-id',
          in: 'header',
        }),
      ])
    );
    expect(res.body.paths).toHaveProperty('/api/prompts');
    expect(res.body.components.schemas).toHaveProperty('ChatRequest');
    expect(res.body.components.schemas).toHaveProperty('ChatMessage');
    expect(res.body.components.schemas).toHaveProperty('CreatePromptRequest');
  });

  it('GET /api/docs/ Swagger UI HTML sayfasını başarıyla sunmalıdır', async () => {
    const res = await request(app).get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('swagger-ui');
  });

  it('saveOpenApiDocument() fonksiyonu dökümanı diske JSON olarak başarıyla kaydetmelidir', () => {
    const filePath = saveOpenApiDocument();
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toHaveProperty('openapi', '3.0.0');
    expect(parsed.info.title).toBe('NexusAI Gateway & Knowledge Base API');
    expect(parsed.paths).toHaveProperty('/api/chat');
    expect(parsed.paths).toHaveProperty('/api/chat/sessions');
    expect(parsed.paths).toHaveProperty('/api/prompts');
  });
});
