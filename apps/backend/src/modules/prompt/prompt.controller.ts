import type { Request, Response, NextFunction } from 'express';
import { promptService } from '#modules/prompt/prompt.service.js';
import { ForbiddenError } from '#shared/errors/index.js';

export class PromptController {
  async createPrompt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prompt = await promptService.createPrompt(req.body);

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
      const { type, isActive, is_active } = req.query as {
        type?: string;
        isActive?: boolean;
        is_active?: boolean;
      };

      const activeFilter = isActive ?? is_active;
      // Superadmin ve admin tüm promptları görebilir; diğer kullanıcılar sadece rollerine uygun olanları görür
      const isPrivileged = req.user?.system_role === 'superadmin' || req.user?.system_role === 'admin';
      const userRoles = isPrivileged ? undefined : (req.user?.roles || []);

      const prompts = await promptService.getPrompts({
        ...(type ? { type } : {}),
        ...(activeFilter !== undefined ? { is_active: activeFilter } : {}),
        ...(userRoles ? { roles: userRoles } : {}),
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
      const prompt = await promptService.getPromptById(req.params.id as string);

      const isPrivileged = req.user?.system_role === 'superadmin' || req.user?.system_role === 'admin';
      if (!isPrivileged) {
        const allowedRoles = prompt.allowed_roles || ['*'];
        const userRoles = req.user?.roles || [];
        const hasAccess = allowedRoles.includes('*') || userRoles.some((r) => allowedRoles.includes(r));
        if (!hasAccess) {
          throw new ForbiddenError('Bu prompt şablonunu görüntüleme yetkiniz bulunmamaktadır.');
        }
      }

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
      const updated = await promptService.updatePrompt(
        req.params.id as string,
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
      const result = await promptService.deletePrompt(req.params.id as string);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const promptController = new PromptController();
