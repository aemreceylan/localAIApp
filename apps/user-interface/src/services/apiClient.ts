/**
 * @file apiClient.ts
 * @description Backend API ile haberleşen, x-tenant-id başlığını otomatik ekleyen hafif ve tip güvenli HTTP istemcisi.
 */

const DEFAULT_TENANT_ID = 'default-tenant';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Genel HTTP istek yöneticisi.
 *
 * @template T Yanıt veri tipi
 * @param endpoint Göreli URL (Örn: '/api/chat/sessions')
 * @param options Standart RequestInit opsiyonları
 * @returns Tip güvenli JSON yanıtı
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const tenantId =
    (typeof window !== 'undefined' && window.localStorage !== undefined
      ? window.localStorage.getItem('nexus_tenant_id')
      : null) || DEFAULT_TENANT_ID;

  const token =
    typeof window !== 'undefined' && window.localStorage !== undefined
      ? window.localStorage.getItem('nexus_token')
      : null;

  const headers = new Headers(options.headers);
  if (!headers.has('x-tenant-id')) {
    headers.set('x-tenant-id', tenantId);
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    cache: options.cache || (endpoint.includes('setup-status') ? 'no-store' : 'default'),
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: { error?: { code?: string; message?: string; details?: unknown } } = {};
    try {
      errorData = await response.json();
    } catch {
      // JSON değilse varsayılan mesaj
    }

    // Kullanıcı anında banlandıysa veya token DB'den silindiyse 401 Unauthorized yakala
    if (response.status === 401 && token && !endpoint.includes('/api/auth/login')) {
      window.localStorage.removeItem('nexus_token');
      window.dispatchEvent(new Event('nexus_auth_logout'));
    }

    const code = errorData.error?.code || `HTTP_${response.status}`;
    const message = errorData.error?.message || `İstek başarısız oldu (${response.status} ${response.statusText})`;
    throw new ApiError(response.status, code, message, errorData.error?.details);
  }

  return response.json() as Promise<T>;
}
