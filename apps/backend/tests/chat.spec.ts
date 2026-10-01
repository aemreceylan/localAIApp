import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '#app.js';

describe('Chat API (POST /api/chat)', () => {
  it('Boş gövde (body) gönderildiğinde 422 VALIDATION_ERROR dönmelidir', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
  });

  it('Mesaj listesi boş olduğunda doğrulama hatası vermelidir', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ messages: [] });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].message).toContain('En az bir mesaj gönderilmelidir');
  });

  it('Geçersiz role sahip mesaj gönderildiğinde 422 dönmelidir', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        messages: [{ role: 'hacker', content: 'Merhaba' }],
        model: 'llama3.2:3b',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Oturumsuz istekte model seçilmediğinde 422 VALIDATION_ERROR dönmelidir', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        messages: [{ role: 'user', content: 'Merhaba' }],
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('model');
  });
});
