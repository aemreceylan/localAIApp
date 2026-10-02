/**
 * @file auth.controller.ts
 * @description Kimlik doğrulama, kullanıcı ve rol yönetimi HTTP istek işleyicileri (Controller).
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
   * İlk Super Admin kaydını tamamlar.
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
        message: 'Super Admin hesabı başarıyla oluşturuldu.',
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

  /**
   * POST /api/auth/superadmin/transfer
   * Superadmin yetkisini başka bir kullanıcıya devreder.
   */
  async transferSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.transferSuperAdmin(req.user!, req.body, {
        ipAddress,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/admin/assign
   * Superadmin tarafından kullanıcıya Admin rolü atanması.
   */
  async assignAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const user = await authService.assignAdmin(req.user!, req.body.targetUserId, {
        ipAddress,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'Kullanıcı başarıyla Admin olarak yetkilendirildi.',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/admin/revoke
   * Superadmin tarafından Admin yetkisinin geri alınması.
   */
  async revokeAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const user = await authService.revokeAdmin(req.user!, req.body.targetUserId, {
        ipAddress,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'Admin yetkisi başarıyla geri alındı.',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/users
   * Tüm personelleri listeler.
   */
  async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await authService.listUsers();
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/users/:id/ban
   * Kullanıcıyı askıya alır / banlar.
   */
  async banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.id as string;
      const { reason } = req.body || {};
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const user = await authService.banUser(req.user!, targetUserId, reason, {
        ipAddress,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'Kullanıcı hesabı askıya alındı ve oturumları sonlandırıldı.',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/users/:id/unban
   * Kullanıcı banını kaldırır.
   */
  async unbanUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.id as string;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const user = await authService.unbanUser(req.user!, targetUserId, {
        ipAddress,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'Kullanıcı hesabı tekrar aktif edildi.',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/auth/users/:id/roles
   * Kullanıcıya departman/fonksiyonel rolleri atar.
   */
  async assignUserRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.id as string;
      const { roles } = req.body;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const user = await authService.assignUserRoles(req.user!, targetUserId, roles, {
        ipAddress,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'Kullanıcı rolleri başarıyla güncellendi.',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/auth/users/:id/permissions/override
   * Kullanıcıya özel izin ezme (allow/deny override).
   */
  async overridePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.id as string;
      const { allow = [], deny = [] } = req.body;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const user = await authService.overrideUserPermissions(req.user!, targetUserId, allow, deny, {
        ipAddress,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'Kullanıcıya özel yetki istisnaları başarıyla uygulandı.',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
