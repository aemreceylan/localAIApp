import type { Request, Response, NextFunction } from 'express';
import { tenantIdSchema } from '#shared/validation/index.js';
import { ValidationError } from '#shared/errors/index.js';

/**
 * Gelen HTTP isteklerindeki `x-tenant-id` başlığını denetler.
 * Başlık belirtilmişse format kurallarına uygunluğunu doğrular,
 * belirtilmemişse varsayılan 'default-tenant' değerini atar.
 */
export const tenantMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const rawTenant = req.headers['x-tenant-id'];

  if (rawTenant !== undefined) {
    const result = tenantIdSchema.safeParse(rawTenant);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        field: 'headers.x-tenant-id',
        message: i.message,
      }));
      throw new ValidationError('Geçersiz x-tenant-id başlığı.', issues);
    }
  } else {
    // Başlık yoksa varsayılan kiracıyı ayarla
    req.headers['x-tenant-id'] = 'default-tenant';
  }

  next();
};
