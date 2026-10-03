/**
 * @file rag.routes.ts
 * @description RAG Bilgi Bankası ve Admin Kuyruk/Yapılandırma Express API Rotaları.
 * Adminlerin BullMQ çalışma parametrelerini (concurrency, attempts, chunking)
 * yönetmesini ve doküman indeksleme kuyruğunu izlemesini sağlar.
 *
 * Güvenlik & Yetkilendirme:
 * - Admin Rotaları (`/api/admin/rag/*`): Yalnızca `admin` ve `superadmin` rolü erişebilir.
 * - Zero-Context-Leakage: Rol bazlı erişim denetimi tüm uç noktalarda zorunludur.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, requirePermission } from '#modules/auth/index.js';
import { PERMISSIONS } from '#modules/role/index.js';
import { validateRequest } from '#shared/middleware/index.js';
import { ragConfigService } from './rag-config.service.js';
import { updateRagConfigSchema } from './rag-config.dto.js';
import { ragMulter } from './rag.multer.js';
import { ragController } from './rag.controller.js';
import {
  uploadDocumentMetadataSchema,
  listDocumentsQuerySchema,
  updateDocumentRolesSchema,
  ragQuerySchema,
} from './rag.dto.js';

export { bullBoardRouter } from './bull-board.js';

export const adminRagRoutes = Router();

// Tüm admin RAG rotalarında kimlik doğrulama ve Admin RAG yetkisi zorunludur
adminRagRoutes.use(requireAuth);
adminRagRoutes.use(requirePermission(PERMISSIONS.ADMIN_RAG_SYNC));

/**
 * GET /api/admin/rag/settings
 * Mevcut RAG ve BullMQ kuyruk yapılandırma parametrelerini döndürür.
 */
adminRagRoutes.get(
  '/settings',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await ragConfigService.getConfig();
      res.status(200).json({
        success: true,
        data: {
          concurrency: config.concurrency,
          attempts: config.attempts,
          backoff_delay_ms: config.backoff_delay_ms,
          chunk_size: config.chunk_size,
          chunk_overlap: config.chunk_overlap,
          remove_on_complete_count: config.remove_on_complete_count,
          remove_on_fail_count: config.remove_on_fail_count,
          updated_at: config.updated_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/admin/rag/settings
 * RAG ve BullMQ ayarlarını günceller ve çalışan sisteme anında yansıtır (Hot-Reload).
 */
adminRagRoutes.put(
  '/settings',
  validateRequest({ body: updateRagConfigSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await ragConfigService.updateConfig(req.body);
      res.status(200).json({
        success: true,
        message: 'RAG ve kuyruk ayarları başarıyla güncellendi.',
        data: {
          concurrency: updated.concurrency,
          attempts: updated.attempts,
          backoff_delay_ms: updated.backoff_delay_ms,
          chunk_size: updated.chunk_size,
          chunk_overlap: updated.chunk_overlap,
          remove_on_complete_count: updated.remove_on_complete_count,
          remove_on_fail_count: updated.remove_on_fail_count,
          updated_at: updated.updated_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// ANA RAG VE BİLGİ BANKASI İŞLEM ROTALARI
// ==========================================
export const ragRoutes = Router();

/**
 * POST /api/rag/upload
 * Dosya yükler ve asenkron indeksleme kuyruğuna alır (HTTP 202 Accepted).
 */
ragRoutes.post(
  '/upload',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_RAG_UPLOAD),
  ragMulter.single('file'),
  validateRequest({ body: uploadDocumentMetadataSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await ragController.upload(req, res, next);
  }
);

/**
 * GET /api/rag/documents
 * Kullanıcının yetkili olduğu dokümanları sayfalı olarak listeler.
 */
ragRoutes.get(
  '/documents',
  requireAuth,
  validateRequest({ query: listDocumentsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await ragController.list(req, res, next);
  }
);

/**
 * GET /api/rag/documents/:id
 * Tekil doküman detayını getirir.
 */
ragRoutes.get(
  '/documents/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await ragController.getById(req, res, next);
  }
);

/**
 * PATCH /api/rag/documents/:id/roles
 * Dokümanın erişim rollerini (Document ACL) günceller.
 */
ragRoutes.patch(
  '/documents/:id/roles',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_RAG_UPDATE_ROLES),
  validateRequest({ body: updateDocumentRolesSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await ragController.updateRoles(req, res, next);
  }
);

/**
 * DELETE /api/rag/documents/:id
 * Dokümanı ve ilişkili tüm vektör indekslerini siler.
 */
ragRoutes.delete(
  '/documents/:id',
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_RAG_DELETE),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await ragController.delete(req, res, next);
  }
);

/**
 * POST /api/rag/query
 * Zero-Context-Leakage prensibiyle semantik arama yapar.
 */
ragRoutes.post(
  '/query',
  requireAuth,
  validateRequest({ body: ragQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await ragController.query(req, res, next);
  }
);
