import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '#app.js';
import { connectDatabase, disconnectDatabase } from '#shared/database/index.js';
import { ConversationModel } from '#modules/chat/conversation.model.js';
import { MessageModel } from '#modules/chat/message.model.js';
import { authService } from '#modules/auth/index.js';
import { Types } from 'mongoose';

describe('Sohbet Oturumları API (Chat Sessions API)', () => {
  const testUserId = new Types.ObjectId().toString();

  beforeAll(async () => {
    await connectDatabase();
    await ConversationModel.deleteMany({ title: 'Mimari İstişare Oturumu' });
    await MessageModel.deleteMany({});

    vi.spyOn(authService, 'validateToken').mockResolvedValue({
      user: {
        _id: testUserId,
        email: 'tester@test.local',
        system_role: 'user',
        roles: ['developer'],
        is_active: true,
      } as any,
      session: {
        expires_at: new Date(Date.now() + 86400000),
      } as any,
    });
  });

  afterAll(async () => {
    await ConversationModel.deleteMany({ title: 'Mimari İstişare Oturumu' });
    await MessageModel.deleteMany({});
    await disconnectDatabase();
  });

  let createdSessionId: string;

  it('POST /api/chat/sessions yeni bir oturum oluşturmalı ve 201 dönmelidir', async () => {
    const res = await request(app)
      .post('/api/chat/sessions')
      .set('Authorization', 'Bearer nx_test_token')
      .send({
        title: 'Mimari İstişare Oturumu',
        model: 'llama3.2:3b',
        customInstructions: 'Uzman bir yazılım mimarı olarak yanıt ver.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('_id');
    expect(res.body.data.title).toBe('Mimari İstişare Oturumu');
    expect(res.body.data.model).toBe('llama3.2:3b');

    createdSessionId = res.body.data._id;
  });

  it('POST /api/chat/sessions model belirtilmediğinde 422 VALIDATION_ERROR dönmelidir', async () => {
    const res = await request(app)
      .post('/api/chat/sessions')
      .set('Authorization', 'Bearer nx_test_token')
      .send({
        title: 'Model Seçilmemiş Oturum',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('model');
  });

  it('GET /api/chat/sessions oturumları listelemelidir', async () => {
    const res = await request(app)
      .get('/api/chat/sessions')
      .set('Authorization', 'Bearer nx_test_token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((s: any) => s._id === createdSessionId)).toBe(true);
  });

  it('GET /api/chat/sessions/:id tekil oturum detayını getirmelidir', async () => {
    const res = await request(app)
      .get(`/api/chat/sessions/${createdSessionId}`)
      .set('Authorization', 'Bearer nx_test_token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(createdSessionId);
  });

  it('GET /api/chat/sessions/:id bulunamayan oturum için 404 NOT_FOUND dönmelidir', async () => {
    const fakeId = '66f7d540e11893c5d808e9a2';
    const res = await request(app)
      .get(`/api/chat/sessions/${fakeId}`)
      .set('Authorization', 'Bearer nx_test_token');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/chat/sessions/:id/messages başlangıçta boş mesaj listesi dönmelidir', async () => {
    const res = await request(app)
      .get(`/api/chat/sessions/${createdSessionId}/messages`)
      .set('Authorization', 'Bearer nx_test_token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('DELETE /api/chat/sessions/:id oturumu başarıyla silmelidir', async () => {
    const res = await request(app)
      .delete(`/api/chat/sessions/${createdSessionId}`)
      .set('Authorization', 'Bearer nx_test_token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Tekrar sorguladığımızda 404 dönmeli
    const checkRes = await request(app)
      .get(`/api/chat/sessions/${createdSessionId}`)
      .set('Authorization', 'Bearer nx_test_token');

    expect(checkRes.status).toBe(404);
  });
});
