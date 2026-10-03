/**
 * @file rate-limiter.middleware.ts
 * @description Harici npm bağımlılığı gerektirmeyen, bellek içi kayan pencere (Sliding Window)
 * algoritmasıyla çalışan kurumsal Hız Sınırlayıcı (Rate Limiter) middleware'i.
 *
 * Güvenlik & Kaba Kuvvet Koruması (OWASP API4:2023 - Unrestricted Resource Consumption):
 * - /api/auth/login, /api/auth/setup gibi kritik noktalarda kaba kuvvet (brute-force) saldırılarını engeller.
 * - Sınır aşıldığında HTTP 429 Too Many Requests ve standart Retry-After başlığı döndürür.
 * - Test ortamında (NODE_ENV === 'test') test akışlarını kesmemek için bypass edilir.
 */

import type { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * Belirtilen zaman penceresi ve maksimum istek limitine sahip Express rate limiter middleware üretir.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    message = 'Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin.',
    keyGenerator = (req: Request) => {
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Bellek sızıntısını önlemek için her 5 dakikada bir eski kayıtları süpür (GC cleanup)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      const activeTimestamps = record.timestamps.filter((t) => now - t < windowMs);
      if (activeTimestamps.length === 0) {
        hits.delete(key);
      } else {
        record.timestamps = activeTimestamps;
      }
    }
  }, Math.max(windowMs, 60000));

  // Node process kapanırken timer'ı serbest bırak (unref)
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Test ortamında hız sınırını bypass et
    if (process.env['NODE_ENV'] === 'test') {
      next();
      return;
    }

    const key = keyGenerator(req);
    const now = Date.now();

    const record = hits.get(key) || { timestamps: [] };
    const windowStart = now - windowMs;
    const recentHits = record.timestamps.filter((t) => t > windowStart);

    if (recentHits.length >= max) {
      const oldestHit = recentHits[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((oldestHit + windowMs - now) / 1000));

      res.setHeader('Retry-After', retryAfterSec.toString());
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(oldestHit + windowMs).toISOString());

      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message,
          retryAfterSeconds: retryAfterSec,
        },
      });
      return;
    }

    recentHits.push(now);
    hits.set(key, { timestamps: recentHits });

    const remaining = Math.max(0, max - recentHits.length);
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());

    next();
  };
}
