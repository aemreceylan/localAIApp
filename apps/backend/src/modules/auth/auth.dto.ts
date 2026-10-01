/**
 * @file auth.dto.ts
 * @description Kimlik doğrulama, ilk kurulum ve oturum Zod DTO şemaları ve OpenAPI tanımları.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const setupSuperAdminSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Ad en az 2 karakter olmalıdır.')
    .max(50, 'Ad en fazla 50 karakter olabilir.')
    .openapi({
      description: 'Sistem Yöneticisi Adı',
      example: 'Ahmet Emre',
    }),
  lastName: z
    .string()
    .min(2, 'Soyad en az 2 karakter olmalıdır.')
    .max(50, 'Soyad en fazla 50 karakter olabilir.')
    .openapi({
      description: 'Sistem Yöneticisi Soyadı',
      example: 'Ceylan',
    }),
  email: z
    .string()
    .email('Geçerli bir kurumsal e-posta adresi giriniz.')
    .openapi({
      description: 'Super Admin E-posta Adresi',
      example: 'admin@nexusai.local',
    }),
  password: z
    .string()
    .min(8, 'Parola en az 8 karakter olmalıdır.')
    .max(100, 'Parola en fazla 100 karakter olabilir.')
    .openapi({
      description: 'Super Admin Giriş Parolası',
      example: 'SuperGucluSifre2026!',
    }),
  organizationName: z
    .string()
    .min(2, 'Kurum adı en az 2 karakter olmalıdır.')
    .max(100, 'Kurum adı en fazla 100 karakter olabilir.')
    .optional()
    .openapi({
      description: 'İlk kurulumda oluşturulacak varsayılan kurum / şirket adı',
      example: 'NexusAI Kurumsal Çözümler',
    }),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Geçerli bir e-posta adresi giriniz.')
    .openapi({
      description: 'Kayıtlı kullanıcı e-posta adresi',
      example: 'admin@nexusai.local',
    }),
  password: z
    .string()
    .min(1, 'Parola boş olamaz.')
    .openapi({
      description: 'Kullanıcı giriş parolası',
      example: 'SuperGucluSifre2026!',
    }),
});

export const setupStatusResponseSchema = z.object({
  isSetupRequired: z.boolean().openapi({
    description: 'Sistemde henüz bir Super Admin bulunup bulunmadığı (true: ilk kurulum açık, false: kilitli)',
    example: false,
  }),
});

export const userResponseSchema = z.object({
  id: z.string().openapi({ description: 'Kullanıcı ID (ObjectId)' }),
  email: z.string().openapi({ description: 'E-posta' }),
  firstName: z.string().openapi({ description: 'Ad' }),
  lastName: z.string().openapi({ description: 'Soyad' }),
  role: z.enum(['superadmin', 'tenant_admin', 'user']).openapi({ description: 'Kullanıcı Rolü' }),
  tenantId: z.string().openapi({ description: 'Bağlı olunan kiracı ID' }),
  isActive: z.boolean().openapi({ description: 'Hesap aktiflik durumu' }),
});

export const authResponseSchema = z.object({
  token: z.string().openapi({
    description: 'Opaque Bearer Token (Authorization: Bearer <token>)',
    example: 'nx_live_7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
  }),
  user: userResponseSchema,
});

export type SetupSuperAdminDto = z.infer<typeof setupSuperAdminSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type UserResponseDto = z.infer<typeof userResponseSchema>;
export type AuthResponseDto = z.infer<typeof authResponseSchema>;
