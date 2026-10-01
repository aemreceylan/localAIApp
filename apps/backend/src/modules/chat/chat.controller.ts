import type { Request, Response, NextFunction } from 'express';
import { chatService } from '@/modules/chat/chat.service.js';

export class ChatController {
  private getTenantId(req: Request): string {
    return (req.headers['x-tenant-id'] as string) || 'default-tenant';
  }

  /**
   * Canlı LLM sohbet akışını yönetir (opsiyonel oturum kaydı ile).
   */
  async handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const streamResult = await chatService.streamChat(req.body, tenantId);

      // Vercel AI SDK Data Stream Protokolü ile Express yanıtına canlı akış bağlama
      streamResult.pipeDataStreamToResponse(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Yeni bir sohbet oturumu oluşturur.
   */
  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const session = await chatService.createSession(tenantId, req.body);

      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tüm sohbet oturumlarını listeler.
   */
  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const sessions = await chatService.getSessions(tenantId);

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tekil bir oturumu ve detaylarını getirir.
   */
  async getSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const session = await chatService.getSessionById(req.params.id as string, tenantId);

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bir oturuma ait tüm geçmiş mesajları getirir.
   */
  async getSessionMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const messages = await chatService.getSessionMessages(req.params.id as string, tenantId);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bir oturumu ve bağlı mesajlarını siler.
   */
  async deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const result = await chatService.deleteSession(req.params.id as string, tenantId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
