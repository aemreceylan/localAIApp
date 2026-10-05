/**
 * @file telemetry.middleware.ts
 * @description HTTP isteklerinin yanıt süresini ve durum kodunu telemetri sepetine kaydeden ara yazılım.
 */

import type { Request, Response, NextFunction } from 'express';
import { telemetryService } from '#modules/telemetry/telemetry.service.js';

export function telemetryMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Gürültülü veya dokümantasyon statik yollarını atla
  if (req.path === '/favicon.ico' || req.path.startsWith('/api/docs')) {
    next();
    return;
  }

  const startHrTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1_000_000;
    telemetryService.recordHttpRequest(res.statusCode, Math.round(durationMs));
  });

  next();
}
