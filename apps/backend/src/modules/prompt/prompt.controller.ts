import type { Request, Response, NextFunction } from 'express';
import { promptService } from '@/modules/prompt/prompt.service.js';

export class PromptController {
  private getTenantId(req: Request): string {
    return (req.headers['x-tenant-id'] as string) || 'default-tenant';
  }

  async createPrompt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const prompt = await promptService.createPrompt(tenantId, req.body);

      res.status(201).json({
        success: true,
        data: prompt,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPrompts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const { type, isActive, is_active } = req.query as {
        type?: string;
        isActive?: boolean;
        is_active?: boolean;
      };

      const activeFilter = isActive ?? is_active;

      const prompts = await promptService.getPrompts(tenantId, {
        ...(type ? { type } : {}),
        ...(activeFilter !== undefined ? { is_active: activeFilter } : {}),
      });

      res.status(200).json({
        success: true,
        data: prompts,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPromptById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const prompt = await promptService.getPromptById(req.params.id as string, tenantId);

      res.status(200).json({
        success: true,
        data: prompt,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePrompt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const updated = await promptService.updatePrompt(
        req.params.id as string,
        tenantId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePrompt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const result = await promptService.deletePrompt(req.params.id as string, tenantId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const promptController = new PromptController();
