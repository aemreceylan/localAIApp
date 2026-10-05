/**
 * @file telemetry.controller.ts
 * @description Admin paneli telemetri ve sistem performansı HTTP istek işleyicileri.
 */

import type { Request, Response, NextFunction } from 'express';
import { telemetryService } from '#modules/telemetry/telemetry.service.js';

export class TelemetryController {
  /**
   * GET /api/admin/metrics/overview
   * Dashboard için konsolide genel bakış (Sistem, HTTP ve LLM).
   */
  async getOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await telemetryService.getOverview();
      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/metrics/http
   * HTTP trafik ve yanıt süresi dakika dökümü.
   */
  async getHttpMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const minutes = req.query['minutes'] ? Math.min(1440, Math.max(5, Number(req.query['minutes']))) : 60;
      const metrics = telemetryService.getHttpMetrics(minutes);
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/metrics/llm
   * LLM token, model ve TTFT analitiği.
   */
  async getLlmMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hours = req.query['hours'] ? Math.min(720, Math.max(1, Number(req.query['hours']))) : 24;
      const metrics = await telemetryService.getLlmMetrics(hours);
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/metrics/system
   * CPU, Bellek, Event Loop Lag ve Ollama VRAM durumu.
   */
  async getSystemMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await telemetryService.getSystemMetrics();
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const telemetryController = new TelemetryController();
