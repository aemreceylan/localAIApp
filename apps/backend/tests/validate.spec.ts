import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import {
  validateRequest,
  globalErrorHandler,
} from '#shared/middleware/index.js';
import { idParamSchema } from '#shared/validation/index.js';

describe('Generic İstek Doğrulama Middleware (validateRequest)', () => {
  const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Test Rotası: Body ve Params Doğrulama
    app.post(
      '/test-items/:id',
      validateRequest({
        params: idParamSchema,
        body: z.object({
          name: z.string().min(2, 'İsim en az 2 karakter olmalıdır.'),
          count: z.number().min(1, 'Sayı en az 1 olmalıdır.'),
        }),
      }),
      (req: Request, res: Response) => {
        res.status(200).json({
          success: true,
          params: req.params,
          body: req.body,
        });
      }
    );

    // Test Rotası: Query Doğrulama
    app.get(
      '/test-query',
      validateRequest({
        query: z.object({
          page: z.string().transform(Number).pipe(z.number().min(1)),
          filter: z.enum(['active', 'archived']).optional(),
        }),
      }),
      (req: Request, res: Response) => {
        res.status(200).json({
          success: true,
          query: req.query,
        });
      }
    );

    app.use(globalErrorHandler);
    return app;
  };

  const app = createTestApp();
  const validObjectId = '66f7d540e11893c5d808e9a2';

  it('Geçerli body ve params ile istek 200 dönmelidir', async () => {
    const res = await request(app)
      .post(`/test-items/${validObjectId}`)
      .send({
        name: 'Nexus Unit',
        count: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.params.id).toBe(validObjectId);
    expect(res.body.body.name).toBe('Nexus Unit');
  });

  it('Geçersiz body gönderildiğinde 422 VALIDATION_ERROR dönmeli ve field detayını belirtmelidir', async () => {
    const res = await request(app)
      .post(`/test-items/${validObjectId}`)
      .send({
        name: 'A', // 2 karakterden kısa
        count: 0, // 1'den küçük
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'count' }),
      ])
    );
  });

  it('Geçersiz URL ID parametresi gönderildiğinde (MongoDB ObjectId olmayan) 422 dönmelidir', async () => {
    const res = await request(app)
      .post('/test-items/invalid-id-123')
      .send({
        name: 'Nexus Unit',
        count: 5,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('id');
    expect(res.body.error.details[0].message).toContain('Geçersiz ID formatı');
  });

  it('Query parametreleri doğru tiplere dönüştürülmeli ve geçersiz query 422 dönmelidir', async () => {
    const validRes = await request(app).get('/test-query?page=2&filter=active');
    expect(validRes.status).toBe(200);
    expect(validRes.body.query.page).toBe(2);
    expect(validRes.body.query.filter).toBe('active');

    const invalidRes = await request(app).get('/test-query?page=0&filter=unknown');
    expect(invalidRes.status).toBe(422);
    expect(invalidRes.body.error.code).toBe('VALIDATION_ERROR');
  });
});
