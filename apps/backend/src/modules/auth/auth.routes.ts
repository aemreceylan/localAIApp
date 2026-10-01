/**
 * @file auth.routes.ts
 * @description Kimlik doğrulama, ilk kurulum ve oturum API rotaları.
 */

import { Router } from 'express';
import { authController } from '#modules/auth/auth.controller.js';
import { setupSuperAdminSchema, loginSchema } from '#modules/auth/auth.dto.js';
import { requireAuth } from '#modules/auth/auth.middleware.js';
import { validateRequest } from '#shared/middleware/index.js';

const router = Router();

// 1. İlk Kurulum Durumu Sorgusu (Public)
router.get('/setup-status', (req, res, next) => {
  authController.getSetupStatus(req, res, next);
});

// 2. İlk Super Admin Kaydı (Setup Gatekeeper Korumalı, Tek Seferlik)
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

export const authRoutes = router;
