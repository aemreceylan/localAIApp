/**
 * @file auth.dto.ts
 * @description Kimlik doğrulama, ilk kurulum, rol yönetimi ve kullanıcı yetki ezme (override) Zod DTO şemaları.
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

export const customPermissionsSchema = z.object({
  allow: z.array(z.string()).default([]).openapi({ description: 'Kullanıcıya özel eklenen izinler' }),
  deny: z.array(z.string()).default([]).openapi({ description: 'Kullanıcıdan geri alınan/engellenen izinler' }),
});

export const userResponseSchema = z.object({
  id: z.string().openapi({ description: 'Kullanıcı ID (ObjectId)' }),
  email: z.string().openapi({ description: 'E-posta' }),
  firstName: z.string().openapi({ description: 'Ad' }),
  lastName: z.string().openapi({ description: 'Soyad' }),
  systemRole: z.enum(['superadmin', 'admin', 'user']).openapi({ description: 'Sistem Seviyesi Rol' }),
  roles: z.array(z.string()).openapi({ description: 'Kurum içi fonksiyonel departman rolleri' }),
  customPermissions: customPermissionsSchema.optional().openapi({ description: 'Kullanıcıya özel yetki istisnaları' }),
  isActive: z.boolean().openapi({ description: 'Hesap aktiflik/ban durumu' }),
  status: z.enum(['active', 'pending_approval', 'rejected', 'banned']).optional().openapi({ description: 'Onay/Aktivasyon durumu' }),
});

export const authResponseSchema = z.object({
  token: z.string().openapi({
    description: 'Opaque Bearer Token (Authorization: Bearer <token>)',
    example: 'nx_live_7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
  }),
  user: userResponseSchema,
});

export const registerSchema = z.object({
  email: z.string().email('Geçerli bir kurumsal e-posta adresi giriniz.').toLowerCase().trim(),
  password: z.string().min(8, 'Parola en az 8 karakter olmalıdır.'),
  firstName: z.string().min(1, 'Ad zorunludur.').max(50, 'Ad en fazla 50 karakter olabilir.').trim(),
  lastName: z.string().min(1, 'Soyad zorunludur.').max(50, 'Soyad en fazla 50 karakter olabilir.').trim(),
  inviteCode: z.string().trim().optional().openapi({ description: 'Opsiyonel davet kodu' }),
});

export const approveUserSchema = z.object({
  roles: z.array(z.string()).optional().openapi({ description: 'Onaylanan kullanıcıya atanacak fonksiyonel roller' }),
});

export const rejectUserSchema = z.object({
  reason: z.string().max(300).optional().openapi({ description: 'Reddedilme gerekçesi' }),
});

export const createInvitationSchema = z.object({
  assignedRoles: z.array(z.string()).default([]).openapi({ description: 'Davetle katılan kullanıcıya atanacak roller' }),
  maxUses: z.number().int().min(1).default(1).openapi({ description: 'Maksimum kullanım sayısı (Önerilen: 1)' }),
  expiresInHours: z.number().int().min(1).max(720).default(24).openapi({ description: 'Geçerlilik süresi (Saat)' }),
});

export const transferSuperAdminSchema = z.object({
  targetUserId: z.string().min(1, 'Hedef kullanıcı ID zorunludur.'),
  passwordConfirm: z.string().min(1, 'Superadmin doğrulama parolası zorunludur.'),
});

export const assignAdminSchema = z.object({
  targetUserId: z.string().min(1, 'Hedef kullanıcı ID zorunludur.'),
});

export const assignRolesSchema = z.object({
  targetUserId: z.string().min(1, 'Hedef kullanıcı ID zorunludur.'),
  roles: z.array(z.string()).min(1, 'En az bir rol belirtilmelidir.'),
});

export const banUserSchema = z.object({
  targetUserId: z.string().min(1, 'Hedef kullanıcı ID zorunludur.'),
  reason: z.string().optional(),
});

export const overridePermissionsSchema = z.object({
  targetUserId: z.string().min(1, 'Hedef kullanıcı ID zorunludur.'),
  allow: z.array(z.string()).default([]).openapi({ description: 'İstisnai olarak verilen yetkiler' }),
  deny: z.array(z.string()).default([]).openapi({ description: 'İstisnai olarak engellenen yetkiler' }),
});

export type SetupSuperAdminDto = z.infer<typeof setupSuperAdminSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type ApproveUserDto = z.infer<typeof approveUserSchema>;
export type RejectUserDto = z.infer<typeof rejectUserSchema>;
export type CreateInvitationDto = z.infer<typeof createInvitationSchema>;
export type UserResponseDto = z.infer<typeof userResponseSchema>;
export type AuthResponseDto = z.infer<typeof authResponseSchema>;
export type TransferSuperAdminDto = z.infer<typeof transferSuperAdminSchema>;
export type AssignAdminDto = z.infer<typeof assignAdminSchema>;
export type AssignRolesDto = z.infer<typeof assignRolesSchema>;
export type BanUserDto = z.infer<typeof banUserSchema>;
export type OverridePermissionsDto = z.infer<typeof overridePermissionsSchema>;
