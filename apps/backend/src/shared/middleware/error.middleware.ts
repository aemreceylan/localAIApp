import type { Request, Response, NextFunction } from 'express';
import { AppError } from '#shared/errors/index.js';
import { env } from '#config/env.config.js';

export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    });
    return;
  }

  // Beklenmeyen / Yakalanmamış Sistem Hataları (500)
  console.error('[UNHANDLED_ERROR]', err);

  const isProduction = env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Sunucu tarafında beklenmeyen bir hata oluştu.',
      ...(!isProduction && { stack: err.stack }),
    },
  });
};
