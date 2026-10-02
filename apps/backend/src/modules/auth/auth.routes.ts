/**
 * @file auth.routes.ts
 * @description Kimlik doğrulama, ilk kurulum, kullanıcı ve rol yönetimi API rotaları.
 */

import { Router } from 'express';
import { authController } from '#modules/auth/auth.controller.js';
import {
  setupSuperAdminSchema,
  loginSchema,
  transferSuperAdminSchema,
  assignAdminSchema,
  assignRolesSchema,
  banUserSchema,
} from '#modules/auth/auth.dto.js';
import {
  requireAuth,
  requireSuperAdmin,
  requirePermission,
} from '#modules/auth/auth.middleware.js';
import { PERMISSIONS } from '#modules/role/role.types.js';
import { validateRequest } from '#shared/middleware/index.js';

const router = Router();

// 1. İlk Kurulum Durumu Sorgusu (Public)
router.get('/setup-status', (req, res, next) => {
  authController.getSetupStatus(req, res, next);
});

// 2. İlk Super Admin Kaydı (Tek Seferlik Kurulum)
router.post(
  '/setup',
  validateRequest({ body: setupSuperAdminSchema }),
  (req, res, next) => {
    authController.setupSuperAdmin(req, res, next);
  }
);

// 3. Kullanıcı Girişi (Public)
router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  (req, res, next) => {
    authController.login(req, res, next);
  }
);

// 4. Oturumu Kapat / Logout (Korumalı)
router.post('/logout', requireAuth, (req, res, next) => {
  authController.logout(req, res, next);
});

// 5. Aktif Kullanıcı Profil Bilgisi (Korumalı)
router.get('/me', requireAuth, (req, res, next) => {
  authController.getCurrentUser(req, res, next);
});

// 6. Superadmin Sahiplik Devri (Yalnızca Superadmin)
router.post(
  '/superadmin/transfer',
  requireAuth,
  requireSuperAdmin,
  validateRequest({ body: transferSuperAdminSchema }),
  (req, res, next) => {
    authController.transferSuperAdmin(req, res, next);
  }
);

// 7. Admin Rolü Atama (Yalnızca Superadmin)
router.post(
  '/admin/assign',
  requireAuth,
  requireSuperAdmin,
  validateRequest({ body: assignAdminSchema }),
  (req, res, next) => {
    authController.assignAdmin(req, res, next);
  }
);

// 8. Admin Rolünü Geri Alma (Yalnızca Superadmin)
router.post(
  '/admin/revoke',
  requireAuth,
  requireSuperAdmin,
  validateRequest({ body: assignAdminSchema }),
  (req, res, next) => {
    authController.revokeAdmin(req, res, next);
  }
);

// 9. Tüm Kullanıcıları Listele (Yetki: user:read)
router.get(
  '/users',
  requireAuth,
  requirePermission(PERMISSIONS.USER_READ),
  (req, res, next) => {
    authController.listUsers(req, res, next);
  }
);

// 10. Kullanıcıyı Banlama (Yetki: user:ban)
router.post(
  '/users/:id/ban',
  requireAuth,
  requirePermission(PERMISSIONS.USER_BAN),
  validateRequest({ body: banUserSchema.omit({ targetUserId: true }).optional() }),
  (req, res, next) => {
    authController.banUser(req, res, next);
  }
);

// 11. Kullanıcı Banını Kaldırma (Yetki: user:unban)
router.post(
  '/users/:id/unban',
  requireAuth,
  requirePermission(PERMISSIONS.USER_UNBAN),
  (req, res, next) => {
    authController.unbanUser(req, res, next);
  }
);

// 12. Kullanıcıya Fonksiyonel Rolleri Atama (Yetki: user:manage_roles)
router.put(
  '/users/:id/roles',
  requireAuth,
  requirePermission(PERMISSIONS.USER_MANAGE_ROLES),
  validateRequest({ body: assignRolesSchema.omit({ targetUserId: true }) }),
  (req, res, next) => {
    authController.assignUserRoles(req, res, next);
  }
);

export const authRoutes = router;
