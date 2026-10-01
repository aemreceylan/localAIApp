/**
 * @file apiClient.spec.ts
 * @description apiClient servisinin multi-tenant başlıklarını ve hata yönetimini doğrulayan birim testleri.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch, ApiError } from '#services/apiClient';

describe('apiClient Unit Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mock.reset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('isteklere varsayılan olarak default-tenant başlığını eklemelidir', async () => {
    const mockResponse = { success: true, data: { id: 'test-1' } };
    const mockFetch = mock.fn(async () => ({
      ok: true,
      json: async () => mockResponse,
    }));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await apiFetch('/api/test');

    assert.equal(mockFetch.mock.calls.length, 1);
    const [, options] = (mockFetch.mock.calls[0].arguments as unknown) as [string, RequestInit];
    const headers = options.headers as Headers;
    assert.equal(headers.get('x-tenant-id'), 'default-tenant');
    assert.deepEqual(result, mockResponse);
  });

  it('HTTP hata durumunda ApiError fırlatmalıdır', async () => {
    const errorBody = {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Kayıt bulunamadı' },
    };

    const mockFetch = mock.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => errorBody,
    }));
    global.fetch = mockFetch as unknown as typeof fetch;

    await assert.rejects(
      async () => apiFetch('/api/not-found'),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        const apiError = err as ApiError;
        assert.equal(apiError.status, 404);
        assert.equal(apiError.code, 'NOT_FOUND');
        assert.equal(apiError.message, 'Kayıt bulunamadı');
        return true;
      }
    );
  });
});
