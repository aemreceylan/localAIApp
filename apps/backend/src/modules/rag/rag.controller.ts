/**
 * @file rag.controller.ts
 * @description RAG Bilgi Bankası ve Vektör Arama HTTP Uç Nokta Denetleyicisi (Controller).
 * İstemciden gelen dosya yükleme, listeleme, rol güncelleme, silme ve anlamsal arama
 * isteklerini karşılar, HTTP yanıtlarını biçimlendirir.
 */

import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '#shared/errors/index.js';
import { ragService } from './rag.service.js';
import type {
  ListDocumentsQueryInput,
  UpdateDocumentRolesInput,
  RagQueryInput,
} from './rag.dto.js';

export class RagController {
  /**
   * POST /api/rag/upload
   * Dosya yükler ve asenkron indeksleme kuyruğuna alır (HTTP 202 Accepted).
   */
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Bu işlem için kullanıcı oturumu gereklidir.');
      }

      const document = await ragService.uploadDocument(
        req.file,
        req.body,
        req.user as any
      );

      res.status(202).json({
        success: true,
        message: 'Doküman başarıyla yüklendi ve işleme kuyruğuna alındı.',
        data: document,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/rag/documents
   * Rol bazlı erişilebilir dokümanları listeler.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Bu işlem için kullanıcı oturumu gereklidir.');
      }

      const queryInput = req.query as unknown as ListDocumentsQueryInput;
      const result = await ragService.listDocuments(queryInput, req.user);

      res.status(200).json({
        success: true,
        data: result.documents,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/rag/documents/:id
   * Tekil doküman detayını getirir.
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Bu işlem için kullanıcı oturumu gereklidir.');
      }

      const { id } = req.params;
      const document = await ragService.getDocumentById(id as string, req.user);

      res.status(200).json({
        success: true,
        data: document,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/rag/documents/:id/roles
   * Dokümanın erişim rollerini (Document ACL) günceller.
   */
  async updateRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Bu işlem için kullanıcı oturumu gereklidir.');
      }

      const { id } = req.params;
      const body = req.body as UpdateDocumentRolesInput;
      const updated = await ragService.updateDocumentRoles(id as string, body.allowed_roles, req.user);

      res.status(200).json({
        success: true,
        message: 'Doküman erişim rolleri başarıyla güncellendi.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/rag/documents/:id
   * Dokümanı ve vektör tabanındaki noktalarını siler.
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Bu işlem için kullanıcı oturumu gereklidir.');
      }

      const { id } = req.params;
      const result = await ragService.deleteDocument(id as string, req.user);

      res.status(200).json({
        success: true,
        message: 'Doküman ve ilişkili tüm vektör indeksleri başarıyla silindi.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/rag/query
   * Zero-Context-Leakage prensibiyle semantik arama yapar.
   */
  async query(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Bu işlem için kullanıcı oturumu gereklidir.');
      }

      const queryInput = req.body as RagQueryInput;
      const result = await ragService.queryKnowledge(queryInput, req.user);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const ragController = new RagController();
