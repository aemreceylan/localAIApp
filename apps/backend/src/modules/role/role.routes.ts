import { Router } from 'express';
import { roleController } from '#modules/role/role.controller.js';
import { requireAuth, requirePermission } from '#modules/auth/auth.middleware.js';
import { PERMISSIONS } from '#modules/role/role.types.js';
import { createRoleSchema, updateRolePermissionsSchema } from '#modules/role/role.dto.js';
import { validateRequest } from '#shared/middleware/index.js';

const router = Router();

// 1. Rolleri listele
router.get('/', requireAuth, (req, res, next) => {
  roleController.getRoles(req, res, next);
});

// 2. Yeni rol oluştur (Yetki: admin:role:create)
router.post(
  '/',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_ROLE_CREATE),
  validateRequest({ body: createRoleSchema }),
  (req, res, next) => {
    roleController.createRole(req, res, next);
  }
);

// 3. Rol izinlerini güncelle (Yetki: admin:role:update)
router.put(
  '/:slug/permissions',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_ROLE_UPDATE),
  validateRequest({ body: updateRolePermissionsSchema }),
  (req, res, next) => {
    roleController.updateRolePermissions(req, res, next);
  }
);

// 4. Varsayılan kullanıcı rolünü belirle (Yetki: admin:role:set_default)
router.put(
  '/:slug/set-default',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_ROLE_SET_DEFAULT),
  (req, res, next) => {
    roleController.setDefaultRole(req, res, next);
  }
);

export const roleRoutes = router;
