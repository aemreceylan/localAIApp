import { Router } from 'express';
import { promptController } from '#modules/prompt/prompt.controller.js';
import {
  createPromptSchema,
  updatePromptSchema,
  promptQuerySchema,
} from '#modules/prompt/prompt.dto.js';
import { requireAuth, requirePermission } from '#modules/auth/index.js';
import { PERMISSIONS } from '#modules/role/index.js';
import { validateRequest } from '#shared/middleware/index.js';
import { idParamSchema } from '#shared/validation/index.js';

const router = Router();

// Tüm prompt işlemlerinde kimlik doğrulama zorunludur
router.use(requireAuth);

// 1. Yeni Prompt Oluştur (Yetki: admin:prompt:create)
router.post(
  '/',
  requirePermission(PERMISSIONS.ADMIN_PROMPT_CREATE),
  validateRequest({ body: createPromptSchema }),
  (req, res, next) => {
    promptController.createPrompt(req, res, next);
  }
);

// 2. Promptları Listele (Query parametreleri doğrulaması)
router.get(
  '/',
  validateRequest({ query: promptQuerySchema }),
  (req, res, next) => {
    promptController.getPrompts(req, res, next);
  }
);

// 3. Tekil Prompt Getir (Path :id doğrulaması)
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  (req, res, next) => {
    promptController.getPromptById(req, res, next);
  }
);

// 4. Prompt Güncelle (Yetki: admin:prompt:manage)
router.put(
  '/:id',
  requirePermission(PERMISSIONS.ADMIN_PROMPT_MANAGE),
  validateRequest({ params: idParamSchema, body: updatePromptSchema }),
  (req, res, next) => {
    promptController.updatePrompt(req, res, next);
  }
);

// 5. Prompt Sil (Yetki: admin:prompt:manage)
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ADMIN_PROMPT_MANAGE),
  validateRequest({ params: idParamSchema }),
  (req, res, next) => {
    promptController.deletePrompt(req, res, next);
  }
);

export const promptRoutes = router;
