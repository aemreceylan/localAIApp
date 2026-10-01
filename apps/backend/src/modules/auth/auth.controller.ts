/**
 * @file auth.controller.ts
 * @description Kimlik doğrulama HTTP istek işleyicileri (Controller).
 */

import type { Request, Response, NextFunction } from 'express';
import { authService } from '#modules/auth/auth.service.js';

export class AuthController {
  /**
   * GET /api/auth/setup-status
   * Sistem ilk kurulum durumunu sorgular.
   */
  async getSetupStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await authService.getSetupStatus();
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/setup
   * İlk Super Admin ve varsayılan kurum kaydını tamamlar.
   */
  async setupSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.setupSuperAdmin(req.body, {
        ...(ipAddress ? { ipAddress } : {}),
        ...(userAgent ? { userAgent } : {}),
      });

      res.status(201).json({
        success: true,
        message: 'Super Admin hesabı ve kurumsal alan başarıyla oluşturuldu.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/login
   * E-posta ve parola ile kullanıcı girişi.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(req.body, {
        ...(ipAddress ? { ipAddress } : {}),
        ...(userAgent ? { userAgent } : {}),
      });

      res.status(200).json({
        success: true,
        message: 'Giriş başarılı.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   * Aktif oturumu sonlandırır.
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.rawToken || '';

      const result = await authService.logout(rawToken);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   * Aktif kullanıcı profil bilgilerini döner.
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ((req.user as any)?._id || req.headers['x-user-id'] || '').toString();
      const userProfile = await authService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: userProfile,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
