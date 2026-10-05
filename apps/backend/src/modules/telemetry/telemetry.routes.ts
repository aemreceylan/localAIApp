/**
 * @file telemetry.routes.ts
 * @description Admin Telemetri, Performans ve Sistem Sağlığı API Rotaları.
 */

import { Router } from 'express';
import { telemetryController } from '#modules/telemetry/telemetry.controller.js';
import { requireAuth, requirePermission } from '#modules/auth/index.js';
import { PERMISSIONS } from '#modules/role/index.js';

const router = Router();

// Tüm telemetri rotaları doğrulanmış oturum ve 'admin:audit:read' yetkisi gerektirir
router.use(requireAuth);
router.use(requirePermission(PERMISSIONS.ADMIN_AUDIT_READ));

// 1. Genel Bakış Özeti (Dashboard)
router.get('/overview', (req, res, next) => {
  telemetryController.getOverview(req, res, next);
});

// 2. HTTP İstek ve Yanıt Gecikme Metrikleri
router.get('/http', (req, res, next) => {
  telemetryController.getHttpMetrics(req, res, next);
});

// 3. LLM Token ve Model Tüketim Metrikleri
router.get('/llm', (req, res, next) => {
  telemetryController.getLlmMetrics(req, res, next);
});

// 4. Sunucu Donanım ve Runtime Sağlık Durumu
router.get('/system', (req, res, next) => {
  telemetryController.getSystemMetrics(req, res, next);
});

export const telemetryRoutes = router;
