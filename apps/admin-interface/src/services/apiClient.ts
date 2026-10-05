/**
 * @file apiClient.ts
 * @description Kurumsal HTTP İstemcisi.
 * HttpOnly oturum çerezlerini (credentials: 'include') otomatik taşır.
 * 401 oturum sonlanması durumunda 'nexus:unauthorized' olayı fırlatır.
 */

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers = {}, ...rest } = options;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config: RequestInit = {
    ...rest,
    headers: {
      ...defaultHeaders,
      ...(headers as Record<string, string>),
    },
    credentials: 'include', // HttpOnly çerezlerin otomatik taşınması zorunludur
    cache: rest.cache || (endpoint.includes('setup-status') ? 'no-store' : 'default'),
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: await response.text().catch(() => 'Bilinmeyen sunucu hatası') };
    }

    const message =
      errorData?.error?.message ||
      errorData?.message ||
      `İstek başarısız oldu (HTTP ${response.status})`;

    const code = errorData?.error?.code || errorData?.code;
    const details = errorData?.error?.details || errorData?.details;

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('nexus:unauthorized'));
    }

    throw new ApiError(message, response.status, code, details);
  }

  // 204 No Content durumu
  if (response.status === 204) {
    return {} as T;
  }

  const result = await response.json();
  // Standart { success: true, data: ... } formatını çöz
  return (result?.data !== undefined ? result.data : result) as T;
}
