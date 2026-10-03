import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '#app.js';
import { authService } from '#modules/auth/index.js';

describe('Chat API (POST /api/chat)', () => {
  beforeEach(() => {
    vi.spyOn(authService, 'validateToken').mockResolvedValue({
      user: {
        _id: '66f7d540e11893c5d808e9a2',
        email: 'test@user.local',
        system_role: 'user',
        roles: ['developer'],
        is_active: true,
      } as any,
      session: {} as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Kimlik doğrulama belirteci (token) olmadığında 401 UNAUTHORIZED dönmelidir', async () => {
    vi.restoreAllMocks(); // validateToken mock'ını kaldır
    const res = await request(app).post('/api/chat').send({
      messages: [{ role: 'user', content: 'Merhaba' }],
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Boş gövde (body) gönderildiğinde 422 VALIDATION_ERROR dönmelidir', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer nx_live_mocktoken')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
  });

  it('Mesaj listesi boş olduğunda doğrulama hatası vermelidir', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer nx_live_mocktoken')
      .send({ messages: [] });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].message).toContain('En az bir mesaj gönderilmelidir');
  });

  it('Geçersiz role sahip mesaj gönderildiğinde 422 dönmelidir', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer nx_live_mocktoken')
      .send({
        messages: [{ role: 'hacker', content: 'Merhaba' }],
        model: 'llama3.2:3b',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Model seçilmediğinde 422 VALIDATION_ERROR dönmelidir', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer nx_live_mocktoken')
      .send({
        messages: [{ role: 'user', content: 'Merhaba' }],
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('model');
  });
});
