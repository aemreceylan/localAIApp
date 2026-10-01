import { z } from 'zod';

/**
 * 24 karakterlik MongoDB ObjectId doğrulama şeması.
 */
export const objectIdSchema = z
  .string({ required_error: 'ID parametresi zorunludur.' })
  .regex(/^[0-9a-fA-F]{24}$/, 'Geçersiz ID formatı. 24 karakterli hex ObjectId olmalıdır.');

/**
 * Standart tekil ID URL path parametresi (:id) şeması.
 */
export const idParamSchema = z.object({
  id: objectIdSchema,
});

/**
 * Tenant ID doğrulama kuralları (1-64 karakter, alfanümerik, tire, alt çizgi).
 */
export const tenantIdSchema = z
  .string()
  .min(1, 'Tenant ID boş olamaz.')
  .max(64, 'Tenant ID en fazla 64 karakter olabilir.')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Tenant ID yalnızca alfanümerik, tire ve alt çizgi içerebilir.');
