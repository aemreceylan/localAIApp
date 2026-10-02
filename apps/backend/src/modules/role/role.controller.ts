import type { Request, Response, NextFunction } from 'express';
import { roleService } from '#modules/role/role.service.js';

export class RoleController {
  async getRoles(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await roleService.getAllRoles();
      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (err) {
      next(err);
    }
  }

  async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, slug, description, permissions, baseArchetype, base_archetype } = req.body;
      const role = await roleService.createRole({
        name,
        slug,
        description,
        permissions,
        base_archetype: (baseArchetype || base_archetype || 'user') as any,
      });
      res.status(201).json({
        success: true,
        message: 'Rol başarıyla oluşturuldu.',
        data: role,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = req.params.slug as string;
      const { permissions } = req.body;
      const updated = await roleService.updateRolePermissions(slug, permissions);

      res.status(200).json({
        success: true,
        message: 'Rol izinleri başarıyla güncellendi.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async setDefaultRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = req.params.slug as string;
      const updated = await roleService.setDefaultRole(slug);

      res.status(200).json({
        success: true,
        message: `'${updated.name}' başarıyla yeni varsayılan kullanıcı rolü olarak belirlendi.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const roleController = new RoleController();
