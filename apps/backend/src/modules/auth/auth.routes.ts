/**
 * @file auth.routes.ts
 * @description Kimlik doğrulama, ilk kurulum, kullanıcı, rol yönetimi ve yetki ezme API rotaları.
 */

import { Router } from 'express';
import { authController } from '#modules/auth/auth.controller.js';
import {
  setupSuperAdminSchema,
  loginSchema,
  registerSchema,
  approveUserSchema,
  rejectUserSchema,
  createInvitationSchema,
  transferSuperAdminSchema,
  assignAdminSchema,
  assignRolesSchema,
  banUserSchema,
  overridePermissionsSchema,
} from '#modules/auth/auth.dto.js';
import {
  requireAuth,
  requireSuperAdmin,
  requirePermission,
} from '#modules/auth/auth.middleware.js';
import { PERMISSIONS } from '#modules/role/role.types.js';
import { validateRequest, createRateLimiter } from '#shared/middleware/index.js';

const router = Router();

// Hız Sınırlayıcılar (Brute-Force & DoS Savunması)
const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Çok fazla giriş denemesi yapıldı. Lütfen 1 dakika sonra tekrar deneyin.',
});

const setupRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Çok fazla kurulum isteği gönderildi. Lütfen bir süre sonra tekrar deneyin.',
});

const registerRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Çok fazla kayıt denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.',
});

// 1. İlk Kurulum Durumu Sorgusu (Public)
router.get('/setup-status', (req, res, next) => {
  authController.getSetupStatus(req, res, next);
});

// 2. İlk Super Admin Kaydı (Tek Seferlik Kurulum)
router.post(
  '/setup',
  setupRateLimiter,
  validateRequest({ body: setupSuperAdminSchema }),
  (req, res, next) => {
    authController.setupSuperAdmin(req, res, next);
  }
);

// 3. Kullanıcı Girişi (Public)
router.post(
  '/login',
  loginRateLimiter,
  validateRequest({ body: loginSchema }),
  (req, res, next) => {
    authController.login(req, res, next);
  }
);

// 3.1 Yeni Kullanıcı Kaydı (Açık Kayıt veya Davet Kodu ile) (Public)
router.post(
  '/register',
  registerRateLimiter,
  validateRequest({ body: registerSchema }),
  (req, res, next) => {
    authController.register(req, res, next);
  }
);

// 4. Çıkış Yapma (Logout)
router.post('/logout', requireAuth, (req, res, next) => {
  authController.logout(req, res, next);
});

// 5. Aktif Kullanıcı Profilini Getir
router.get('/me', requireAuth, (req, res, next) => {
  authController.getCurrentUser(req, res, next);
});

// 6. Superadmin Sahiplik Devri (Yalnızca Mevcut Superadmin)
router.post(
  '/superadmin/transfer',
  requireAuth,
  requireSuperAdmin,
  validateRequest({ body: transferSuperAdminSchema }),
  (req, res, next) => {
    authController.transferSuperAdmin(req, res, next);
  }
);

// 7. Admin Rolü Atama (Yetki: admin:user:assign_admin)
router.post(
  '/admin/assign',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_ASSIGN_ADMIN),
  validateRequest({ body: assignAdminSchema }),
  (req, res, next) => {
    authController.assignAdmin(req, res, next);
  }
);

// 8. Admin Rolünü Geri Alma (Yetki: admin:user:assign_admin)
router.post(
  '/admin/revoke',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_ASSIGN_ADMIN),
  validateRequest({ body: assignAdminSchema }),
  (req, res, next) => {
    authController.revokeAdmin(req, res, next);
  }
);

// 9. Tüm Kullanıcıları Listele (Yetki: admin:user:read)
router.get(
  '/users',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_READ),
  (req, res, next) => {
    authController.listUsers(req, res, next);
  }
);

// 10. Kullanıcıyı Banlama (Yetki: admin:user:ban)
router.post(
  '/users/:id/ban',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_BAN),
  validateRequest({ body: banUserSchema.omit({ targetUserId: true }).optional() }),
  (req, res, next) => {
    authController.banUser(req, res, next);
  }
);

// 11. Kullanıcı Banını Kaldırma (Yetki: admin:user:unban)
router.post(
  '/users/:id/unban',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_UNBAN),
  (req, res, next) => {
    authController.unbanUser(req, res, next);
  }
);

// 12. Kullanıcıya Fonksiyonel Rolleri Atama (Yetki: admin:user:assign_role)
router.put(
  '/users/:id/roles',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_ASSIGN_ROLE),
  validateRequest({ body: assignRolesSchema.omit({ targetUserId: true }) }),
  (req, res, next) => {
    authController.assignUserRoles(req, res, next);
  }
);

// 13. Kullanıcıya Özel İzin İstisnası Belirleme (Yetki: admin:user:override)
router.put(
  '/users/:id/permissions/override',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_OVERRIDE),
  validateRequest({ body: overridePermissionsSchema.omit({ targetUserId: true }) }),
  (req, res, next) => {
    authController.overridePermissions(req, res, next);
  }
);

// 14. Onay Bekleyen Kullanıcıları Listele (Yetki: admin:user:read)
router.get(
  '/users/pending',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_READ),
  (req, res, next) => {
    authController.getPendingUsers(req, res, next);
  }
);

// 15. Bekleyen Kullanıcıyı Onayla (Yetki: admin:user:assign_role)
router.post(
  '/users/:id/approve',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_ASSIGN_ROLE),
  validateRequest({ body: approveUserSchema.optional() }),
  (req, res, next) => {
    authController.approveUser(req, res, next);
  }
);

// 16. Bekleyen Kullanıcıyı Reddet (Yetki: admin:user:ban)
router.post(
  '/users/:id/reject',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_BAN),
  validateRequest({ body: rejectUserSchema.optional() }),
  (req, res, next) => {
    authController.rejectUser(req, res, next);
  }
);

// 17. Davetiye Kodu Oluştur (Yetki: admin:user:create)
router.post(
  '/invitations',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_CREATE),
  validateRequest({ body: createInvitationSchema }),
  (req, res, next) => {
    authController.createInvitation(req, res, next);
  }
);

// 18. Davetiye Kodlarını Listele (Yetki: admin:user:read)
router.get(
  '/invitations',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_READ),
  (req, res, next) => {
    authController.listInvitations(req, res, next);
  }
);

// 19. Davetiye Kodunu İptal Et (Yetki: admin:user:create)
router.delete(
  '/invitations/:code',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_USER_CREATE),
  (req, res, next) => {
    authController.revokeInvitation(req, res, next);
  }
);

export const authRoutes = router;
