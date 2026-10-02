import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '#app.js';
import { devInspectorHub } from '#shared/dev-inspector/index.js';

describe('DevInspector Canlı Trafik ve Stream İzleyici Testleri', () => {
  beforeEach(() => {
    devInspectorHub.clearHistory();
  });

  it('GET /api/dev/inspector/logs boş geçmişle 200 dönmelidir', async () => {
    const res = await request(app).get('/api/dev/inspector/logs');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.totalRequests).toBe(0);
  });

  it('DevInspectorHub tamponuna trafik eklendiğinde API üzerinden listelenebilmelidir', async () => {
    // Örnek trafik kaydı ekle
    devInspectorHub.emitTraffic({
      id: 'req_test_123',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: '/health',
      status: 200,
      durationMs: 12,
      request: { headers: { host: 'localhost:4000' } },
      response: { status: 200, body: { status: 'ok' } },
    });

    // Inspector loglarını al
    const logsRes = await request(app).get('/api/dev/inspector/logs');
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.logs.length).toBeGreaterThan(0);

    const latest = logsRes.body.logs[0];
    expect(latest.method).toBe('GET');
    expect(latest.url).toBe('/health');
    expect(latest.status).toBe(200);
  });

  it('DELETE /api/dev/inspector/logs geçmişi temizlemelidir', async () => {
    // Önce bir istek yap
    await request(app).get('/health');

    const deleteRes = await request(app).delete('/api/dev/inspector/logs');
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const logsRes = await request(app).get('/api/dev/inspector/logs');
    expect(logsRes.body.logs).toHaveLength(0);
    expect(logsRes.body.stats.totalRequests).toBe(0);
  });

  it('GET /dev/inspector interaktif test arayüzü HTML şablonunu dönmelidir', async () => {
    const res = await request(app).get('/dev/inspector');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('NexusAI Traffic Inspector');
    expect(res.text).toContain('/api/dev/inspector/events');
  });
});
