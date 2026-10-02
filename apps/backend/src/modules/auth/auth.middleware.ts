/**
 * @file auth.middleware.ts
 * @description Opaque Bearer Token kimlik doğrulama, anlık ban denetimi ve yetkilendirme middleware'leri.
 */

import type { Request, Response, NextFunction } from 'express';
import { authService } from '#modules/auth/auth.service.js';
import { PolicyEngine } from '#modules/role/policy.engine.js';
import { UnauthorizedError, ForbiddenError } from '#shared/errors/index.js';
import type { IUser } from '#modules/auth/user.model.js';

// Express Request tipine user ve rawToken alanlarını ekle
declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: any };
      rawToken?: string;
    }
  }
}

/**
 * ZORUNLU KİMLİK DOĞRULAMA VE BAN KONTROLÜ:
 * 1. Opaque Bearer Token'ı doğrular.
 * 2. Kullanıcının banlı olup olmadığını anında kontrol eder.
 * 3. Oturum süresi dolmuş veya token geçersizse 401 Unauthorized; kullanıcı banlıysa 403 Forbidden fırlatır.
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
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

    req.user = result.user as any;
    req.rawToken = rawToken;
    req.headers['x-user-id'] = ((result.user as any)._id || '').toString();

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * AÇIK/KAPALI (OCP) PRENSİBİNE UYGUN YETKİLENDİRME MIDDLEWARE'İ:
 * İlgili endpoint için gerekli olan izni (örn: 'user:ban', 'rag:document:upload') PolicyEngine üzerinden sınar.
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Yetkilendirme denetimi için geçerli bir kullanıcı oturumu gereklidir.');
      }

      const isAllowed = await PolicyEngine.can(req.user, permission);
      if (!isAllowed) {
        throw new ForbiddenError(
          `Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır (Gereken izin: '${permission}').`
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * SUPERADMIN KORUMA GUARD'I:
 * Yalnızca ve kesin olarak tek Superadmin kullanıcısının erişimine izin verir.
 */
export const requireSuperAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new UnauthorizedError('Yetkilendirme denetimi için kullanıcı oturumu gereklidir.');
  }

  if (req.user.system_role !== 'superadmin') {
    throw new ForbiddenError('Bu işlem yalnızca sistemin Super Admin kullanıcısı tarafından gerçekleştirilebilir.');
  }

  next();
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
    if (authHeader?.startsWith('Bearer ')) {
      const rawToken = authHeader.slice(7).trim();
      if (rawToken) {
        const result = await authService.validateToken(rawToken);
        if (result) {
          req.user = result.user as any;
          req.rawToken = rawToken;
          req.headers['x-user-id'] = ((result.user as any)._id || '').toString();
        }
      }
    }
    next();
  } catch {
    next();
  }
};
