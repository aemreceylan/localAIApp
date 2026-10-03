import { Router } from 'express';
import { chatController } from '#modules/chat/chat.controller.js';
import { chatRequestSchema, createSessionSchema } from '#modules/chat/chat.dto.js';
import { validateRequest, createRateLimiter } from '#shared/middleware/index.js';
import { idParamSchema } from '#shared/validation/index.js';

const router = Router();

// Canlı LLM Akışı Hız Sınırlayıcı (Kullanıcı bazlı dakikada 30 istek)
const chatStreamRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Kısa süre içinde çok fazla sohbet isteği gönderildi. Lütfen bir süre sonra tekrar deneyin.',
  keyGenerator: (req) => (req.user as any)?._id?.toString() || req.ip || 'anonymous',
});

// 1. Canlı LLM Akışı (Streaming & Persistence - Gövde doğrulaması)
router.post(
  '/',
  chatStreamRateLimiter,
  validateRequest({ body: chatRequestSchema }),
  (req, res, next) => {
    chatController.handleChat(req, res, next);
  }
);

// 2. Yeni Oturum Oluştur (Gövde doğrulaması)
router.post(
  '/sessions',
  validateRequest({ body: createSessionSchema }),
  (req, res, next) => {
    chatController.createSession(req, res, next);
  }
);

// 3. Oturumları Listele
router.get('/sessions', (req, res, next) => {
  chatController.getSessions(req, res, next);
});

// 4. Tekil Oturum Detayı (Path :id doğrulaması)
router.get(
  '/sessions/:id',
  validateRequest({ params: idParamSchema }),
  (req, res, next) => {
    chatController.getSessionById(req, res, next);
  }
);

// 5. Oturum Mesaj Geçmişi (Path :id doğrulaması)
router.get(
  '/sessions/:id/messages',
  validateRequest({ params: idParamSchema }),
  (req, res, next) => {
    chatController.getSessionMessages(req, res, next);
  }
);

// 6. Oturum Sil (Path :id doğrulaması)
router.delete(
  '/sessions/:id',
  validateRequest({ params: idParamSchema }),
  (req, res, next) => {
    chatController.deleteSession(req, res, next);
  }
);

// 7. Aktif LLM Modellerini Listele
router.get('/models', (req, res, next) => {
  chatController.getAvailableModels(req, res, next);
});

export const chatRoutes = router;
