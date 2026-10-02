import { Router } from 'express';
import { roleController } from '#modules/role/role.controller.js';
import { requireAuth, requirePermission } from '#modules/auth/auth.middleware.js';
import { PERMISSIONS } from '#modules/role/role.types.js';
import { createRoleSchema, updateRolePermissionsSchema } from '#modules/role/role.dto.js';
import { validateRequest } from '#shared/middleware/index.js';

const router = Router();

// Rolleri listele
router.get('/', requireAuth, (req, res, next) => {
  roleController.getRoles(req, res, next);
});

// Yeni rol oluştur (Yetki: user:manage_roles)
router.post(
  '/',
  requireAuth,
  requirePermission(PERMISSIONS.USER_MANAGE_ROLES),
  validateRequest({ body: createRoleSchema }),
  (req, res, next) => {
    roleController.createRole(req, res, next);
  }
);

// Rol izinlerini güncelle (Yetki: user:manage_roles)
router.put(
  '/:slug/permissions',
  requireAuth,
  requirePermission(PERMISSIONS.USER_MANAGE_ROLES),
  validateRequest({ body: updateRolePermissionsSchema }),
  (req, res, next) => {
    roleController.updateRolePermissions(req, res, next);
  }
);

export const roleRoutes = router;
