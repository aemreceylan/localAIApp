import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@/shared/errors/index.js';

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new NotFoundError(`İstenen rota bulunamadı: ${req.method} ${req.originalUrl}`));
};
