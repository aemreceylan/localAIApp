/**
 * @file auth.middleware.ts
 * @description Opaque Bearer Token kimlik doğrulama middleware'i.
 * Gelen HTTP isteklerindeki `Authorization: Bearer <token>` başlığını çözümler,
 * veritabanında doğrular ve `req.user` ile `x-tenant-id` başlıklarını güvenceye alır.
 */

import type { Request, Response, NextFunction } from 'express';
import { authService } from '#modules/auth/auth.service.js';
import { UnauthorizedError } from '#shared/errors/index.js';
import type { IUser } from '#modules/auth/user.model.js';

// Express Request tipine user ve session alanlarını genişlet
declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: any };
      rawToken?: string;
    }
  }
}

/**
 * Zorunlu Kimlik Doğrulama Middleware'i:
 * Geçerli bir Opaque Bearer Token bulunmazsa veya kullanıcı dondurulmuşsa 401 Unauthorized fırlatır.
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Bu işlem için kimlik doğrulama belirteci (Bearer Token) gereklidir.');
    }

    const rawToken = authHeader.slice(7).trim();
    if (!rawToken) {
      throw new UnauthorizedError('Geçersiz kimlik doğrulama belirteci formatı.');
    }

    const result = await authService.validateToken(rawToken);
    if (!result) {
      throw new UnauthorizedError('Oturum süresi dolmuş veya kullanıcı hesabı askıya alınmış.');
    }

    // İstek bağlamına kullanıcıyı ve tenant kimliğini bağla
    req.user = result.user as any;
    req.rawToken = rawToken;
    req.headers['x-tenant-id'] = result.user.tenant_id;
    req.headers['x-user-id'] = ((result.user as any)._id || '').toString();

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * İsteğe Bağlı Kimlik Doğrulama Middleware'i:
 * Token varsa doğrular ve req.user'a ekler; yoksa hata vermeden devam eder.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.slice(7).trim();
      if (rawToken) {
        const result = await authService.validateToken(rawToken);
        if (result) {
          req.user = result.user as any;
          req.rawToken = rawToken;
          req.headers['x-tenant-id'] = result.user.tenant_id;
          req.headers['x-user-id'] = ((result.user as any)._id || '').toString();
        }
      }
    }
    next();
  } catch {
    next();
  }
};
