import type { Request, Response, NextFunction } from 'express';
import { StreamData } from 'ai';
import { chatService } from '#modules/chat/chat.service.js';
import { UnauthorizedError } from '#shared/errors/index.js';

export class ChatController {
  private getUserId(req: Request): string {
    if (!req.user || !(req.user as any)._id) {
      throw new UnauthorizedError('Bu işlem için geçerli bir kullanıcı oturumu gereklidir.');
    }
    return (req.user as any)._id.toString();
  }

  /**
   * Canlı LLM sohbet akışını yönetir (opsiyonel oturum kaydı ve RAG grounding ile).
   */
  async handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const { streamResult, citations } = await chatService.streamChat(req.body, {
        id: userId,
        roles: req.user?.roles,
        system_role: req.user?.system_role,
      });

      // Varsa RAG alıntı adet bilgisini HTTP response header'ına ekle
      if (citations && citations.length > 0) {
        res.setHeader('x-nexusai-citations-count', citations.length.toString());
      }

      // Vercel AI SDK StreamData ile alıntıları mesaj annotasyonu olarak istemciye ilet
      const streamData = new StreamData();
      if (citations && citations.length > 0) {
        streamData.appendMessageAnnotation({
          type: 'rag-citations',
          citations: citations as any,
        });
      }
      void streamData.close();

      // Vercel AI SDK Data Stream Protokolü ile Express yanıtına canlı akış bağlama
      streamResult.pipeDataStreamToResponse(res, { data: streamData });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Yeni bir sohbet oturumu oluşturur.
   */
  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const session = await chatService.createSession(req.body, userId);

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
      const userId = this.getUserId(req);
      const sessions = await chatService.getSessions(userId);

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
      const userId = this.getUserId(req);
      const session = await chatService.getSessionById(req.params.id as string, userId);

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
      const userId = this.getUserId(req);
      const messages = await chatService.getSessionMessages(req.params.id as string, userId);

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
      const userId = this.getUserId(req);
      const result = await chatService.deleteSession(req.params.id as string, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sistemde ve sağlayıcılarda anlık kullanılabilir olan modelleri listeler.
   */
  async getAvailableModels(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chatService.getAvailableModels();

      res.status(200).json({
        success: true,
        data: result.models,
        defaultModel: result.defaultModel,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
