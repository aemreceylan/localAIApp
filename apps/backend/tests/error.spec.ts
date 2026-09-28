import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Request, type Response, type NextFunction } from 'express';
import app from '../src/app.js';
import {
  AppError,
  DomainError,
  NotFoundError,
  ValidationError,
  UnauthorizedTenantError,
  LLMProviderError,
} from '../src/shared/errors/index.js';
import { globalErrorHandler } from '../src/shared/middleware/index.js';

describe('Hata Yönetimi (Error Classes & Hierarchy)', () => {
  it('AppError sınıfları doğru statusCode ve code değerlerine sahip olmalıdır', () => {
    const notFound = new NotFoundError('Kullanıcı bulunamadı');
    expect(notFound).toBeInstanceOf(AppError);
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe('NOT_FOUND');
    expect(notFound.message).toBe('Kullanıcı bulunamadı');

    const validation = new ValidationError('Geçersiz veri', [{ field: 'email' }]);
    expect(validation).toBeInstanceOf(AppError);
    expect(validation.statusCode).toBe(422);
    expect(validation.code).toBe('VALIDATION_ERROR');
    expect(validation.details).toEqual([{ field: 'email' }]);

    const tenant = new UnauthorizedTenantError();
    expect(tenant).toBeInstanceOf(AppError);
    expect(tenant.statusCode).toBe(403);
    expect(tenant.code).toBe('UNAUTHORIZED_TENANT');

    const domain = new DomainError('İş kuralı ihlali');
    expect(domain).toBeInstanceOf(AppError);
    expect(domain.statusCode).toBe(400);
    expect(domain.code).toBe('DOMAIN_ERROR');

    const llm = new LLMProviderError('Bağlantı koptu');
    expect(llm).toBeInstanceOf(AppError);
    expect(llm.statusCode).toBe(502);
    expect(llm.code).toBe('LLM_PROVIDER_ERROR');
  });

  it('AppError factory statik metotları doğru sınıfları üretmelidir', () => {
    expect(AppError.notFound('Test')).toBeInstanceOf(NotFoundError);
    expect(AppError.validation('Test')).toBeInstanceOf(ValidationError);
    expect(AppError.badRequest('Test')).toBeInstanceOf(DomainError);
    expect(AppError.unauthorizedTenant('Test')).toBeInstanceOf(UnauthorizedTenantError);
    expect(AppError.llmProvider('Test')).toBeInstanceOf(LLMProviderError);
  });
});

describe('Hata Middleware Testleri (Middleware Integration)', () => {
  it('Tanımsız bir rotaya gidildiğinde 404 NOT_FOUND dönmelidir', async () => {
    const res = await request(app).get('/api/v1/tanimsiz-rota');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('İstenen rota bulunamadı'),
      },
    });
  });

  it('GlobalErrorHandler AppError fırlatıldığında standart envelope ile dönmelidir', async () => {
    const testApp = express();
    testApp.get('/test-error', (_req: Request, _res: Response, next: NextFunction) => {
      next(AppError.validation('Geçersiz girdi', { field: 'name' }));
    });
    testApp.use(globalErrorHandler);

    const res = await request(testApp).get('/test-error');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Geçersiz girdi',
        details: { field: 'name' },
      },
    });
  });

  it('GlobalErrorHandler beklenmeyen hatalarda 500 INTERNAL_SERVER_ERROR dönmelidir', async () => {
    const testApp = express();
    testApp.get('/crash', () => {
      throw new Error('Veritabanı çöktü');
    });
    testApp.use(globalErrorHandler);

    const res = await request(testApp).get('/crash');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error.message).toBe('Sunucu tarafında beklenmeyen bir hata oluştu.');
  });
});
