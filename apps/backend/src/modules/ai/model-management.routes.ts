/**
 * @file model-management.routes.ts
 * @description Admin Paneli Model Yönetimi, SSE İndirme ve Silme Rotaları.
 */

import { Router } from 'express';
import { modelManagementController } from '#modules/ai/model-management.controller.js';
import { requireAuth, requirePermission } from '#modules/auth/index.js';
import { PERMISSIONS } from '#modules/role/index.js';

const router = Router();

router.use(requireAuth);

// 1. Modelleri ve Varsayılan Modeli Listele (Yetki: admin:model:read)
router.get('/', requirePermission(PERMISSIONS.ADMIN_MODEL_READ), (req, res, next) => {
  modelManagementController.listModels(req, res, next);
});

// 2. Varsayılan Modeli Belirle (Yetki: admin:model:set_default)
router.post('/default', requirePermission(PERMISSIONS.ADMIN_MODEL_SET_DEFAULT), (req, res, next) => {
  modelManagementController.setDefaultModel(req, res, next);
});

// 3. Yerel Modeli SSE Akışıyla İndir (Yetki: admin:model:manage)
router.post('/pull', requirePermission(PERMISSIONS.ADMIN_MODEL_MANAGE), (req, res, next) => {
  modelManagementController.pullModel(req, res, next);
});

// 4. Yerel Modeli Sil (Yetki: admin:model:manage)
router.delete('/:name', requirePermission(PERMISSIONS.ADMIN_MODEL_MANAGE), (req, res, next) => {
  modelManagementController.deleteModel(req, res, next);
});

export const adminModelRoutes = router;
