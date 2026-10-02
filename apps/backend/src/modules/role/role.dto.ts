/**
 * @file role.dto.ts
 * @description Dinamik rol tanımlama, arketip tavan kısıtlaması ve izin güncelleme DTO şemaları.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const createRoleSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Rol adı en az 2 karakter olmalıdır.')
      .max(50, 'Rol adı en fazla 50 karakter olabilir.')
      .openapi({
        description: 'Görünen Rol Adı',
        example: 'İnsan Kaynakları Uzmanı',
      }),
    slug: z
      .string()
      .min(2, 'Rol kodu (slug) en az 2 karakter olmalıdır.')
      .max(30, 'Rol kodu (slug) en fazla 30 karakter olabilir.')
      .regex(/^[a-z0-9_-]+$/, 'Rol kodu yalnızca küçük harf, rakam, tire ve alt çizgi içerebilir.')
      .openapi({
        description: 'Benzersiz Rol Tanımlayıcısı (slug)',
        example: 'hr_specialist',
      }),
    description: z
      .string()
      .max(250, 'Açıklama en fazla 250 karakter olabilir.')
      .optional()
      .openapi({
        description: 'Rol Açıklaması',
        example: 'İnsan Kaynakları departmanı personelleri için erişim izinleri.',
      }),
    baseArchetype: z
      .enum(['admin', 'user'])
      .openapi({
        description: 'Rolün türetildiği ana arketip (Yetki tavanını belirler)',
        example: 'user',
      }),
    permissions: z
      .array(z.string())
      .default([])
      .openapi({
        description: 'Role atanan yetkiler listesi',
        example: ['user:rag:read', 'user:prompt:read'],
      }),
  })
  .refine(
    (data) => {
      if (data.baseArchetype === 'user') {
        return !data.permissions.some((p) => p.startsWith('admin:'));
      }
      return true;
    },
    {
      message: "Yetki Tavanı İhlali: 'user' arketipindeki bir role 'admin:' seviyesinde izin atanamaz.",
      path: ['permissions'],
    }
  );

export const updateRolePermissionsSchema = z.object({
  permissions: z
    .array(z.string())
    .openapi({
      description: 'Güncellenecek yeni yetki listesi',
      example: ['user:rag:read', 'user:prompt:read'],
    }),
});

export const setDefaultRoleSchema = z.object({
  slug: z
    .string()
    .min(2, 'Rol kodu en az 2 karakter olmalıdır.')
    .openapi({
      description: 'Yeni kaydolan kullanıcılar için varsayılan yapılacak rol slug değeri',
      example: 'default_user',
    }),
});

export const roleResponseSchema = z.object({
  id: z.string().openapi({ description: 'Rol ID' }),
  name: z.string().openapi({ description: 'Rol Adı' }),
  slug: z.string().openapi({ description: 'Rol Tanımlayıcısı (slug)' }),
  description: z.string().optional().openapi({ description: 'Rol Açıklaması' }),
  baseArchetype: z.enum(['admin', 'user']).openapi({ description: 'Ana Arketip' }),
  permissions: z.array(z.string()).openapi({ description: 'Rol İzinleri' }),
  isDefault: z.boolean().openapi({ description: 'Varsayılan Kullanıcı Rolü mü?' }),
  isSystem: z.boolean().openapi({ description: 'Sistem Rolü mü?' }),
});

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
export type UpdateRolePermissionsDto = z.infer<typeof updateRolePermissionsSchema>;
export type SetDefaultRoleDto = z.infer<typeof setDefaultRoleSchema>;
export type RoleResponseDto = z.infer<typeof roleResponseSchema>;
