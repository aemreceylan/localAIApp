/**
 * @file model-management.controller.ts
 * @description Admin Paneli Model Yönetimi, SSE Akışlı Model İndirme ve Silme Controller.
 */

import type { Request, Response, NextFunction } from 'express';
import { modelManagementService } from '#modules/ai/model-management.service.js';

export class ModelManagementController {
  /**
   * GET /api/admin/models
   * Sistemdeki tüm modelleri ve varsayılan modeli listeler.
   */
  async listModels(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await modelManagementService.listModels();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/models/default
   * Kurum için varsayılan LLM modelini belirler.
   */
  async setDefaultModel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { modelId } = req.body;
      const result = await modelManagementService.setDefaultModel(modelId);
      res.status(200).json({
        success: true,
        message: 'Varsayılan model başarıyla güncellendi.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/models/pull
   * Yerel Ollama modelini SSE akışıyla indirir.
   */
  async pullModel(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const { modelName } = req.body;

    if (!modelName || typeof modelName !== 'string') {
      res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Model adı zorunludur.',
        },
      });
      return;
    }

    // SSE Başlıkları
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      await modelManagementService.pullModel(
        modelName,
        (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        },
        abortController.signal
      );

      res.write(`data: ${JSON.stringify({ status: 'success', percent: 100, message: 'Model başarıyla indirildi ve sisteme eklendi.' })}\n\n`);
      res.end();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Model indirme sırasında hata oluştu.';
      res.write(`data: ${JSON.stringify({ status: 'error', error: errorMessage })}\n\n`);
      res.end();
    }
  }

  /**
   * DELETE /api/admin/models/:name
   * Yerel Ollama modelini sistemden kaldırır.
   */
  async deleteModel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const modelName = req.params.name as string;
      const result = await modelManagementService.deleteModel(modelName);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const modelManagementController = new ModelManagementController();
