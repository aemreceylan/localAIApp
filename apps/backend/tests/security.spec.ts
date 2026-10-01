import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '#app.js';
import { env } from '#config/env.config.js';

describe('Güvenlik ve Middleware Testleri (Security & Headers)', () => {
  it('Helmet güvenlik başlıkları yanıta eklenmelidir', async () => {
    const res = await request(app).get('/health');

    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(res.headers).toHaveProperty('x-dns-prefetch-control', 'off');
    expect(res.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
  });

  it('CORS başlıkları izin verilen origin için doğru yapılandırılmalıdır', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', env.CORS_ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(env.CORS_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('OPTIONS Preflight isteklerine CORS başlıklarıyla 204 dönmelidir', async () => {
    const res = await request(app)
      .options('/api/chat')
      .set('Origin', env.CORS_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(env.CORS_ORIGIN);
  });
});
