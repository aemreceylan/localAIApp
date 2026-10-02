import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const promptTypeSchema = z.enum(['system_guardrail', 'persona', 'custom'], {
  required_error: 'Prompt tipi (system_guardrail, persona, custom) zorunludur.',
}).openapi({
  description: 'Prompt tipi: system_guardrail (Zorunlu Güvenlik Kuralı), persona (Uzman Rolü), custom (Özel Şablon)',
  example: 'persona',
});

export const createPromptSchema = z.object({
  title: z
    .string({ required_error: 'Başlık zorunludur.' })
    .min(1, 'Başlık boş olamaz.')
    .max(150, 'Başlık 150 karakterden uzun olamaz.')
    .openapi({
      description: 'Prompt veya persona adı',
      example: 'Hukuk ve Sözleşme Danışmanı',
    }),
  slug: z
    .string({ required_error: 'Slug zorunludur.' })
    .min(1, 'Slug boş olamaz.')
    .regex(/^[a-z0-9-]+$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir.')
    .openapi({
      description: 'Benzersiz kimlik adı (URL ve kod erişimi için)',
      example: 'legal-advisor',
    }),
  type: promptTypeSchema,
  content: z
    .string({ required_error: 'Prompt içeriği zorunludur.' })
    .min(1, 'Prompt içeriği boş olamaz.')
    .openapi({
      description: 'Modele verilecek sistem talimat metni',
      example: 'Sen deneyimli bir kurumsal hukuk danışmanısın. Sözleşmeleri risk ve mevzuat açısından incele.',
    }),
  allowedRoles: z
    .array(z.string())
    .optional()
    .default(['*'])
    .openapi({
      description: 'Bu promptu görebilecek ve kullanabilecek roller (örn: ["*"] veya ["hr", "developer"])',
      example: ['*'],
    }),
  isActive: z
    .boolean()
    .optional()
    .default(true)
    .openapi({
      description: 'Promptun aktif olup olmadığı',
      example: true,
    }),
  isDefault: z
    .boolean()
    .optional()
    .default(false)
    .openapi({
      description: 'Yeni açılan sohbetlerde varsayılan persona olup olmadığı',
      example: false,
    }),
  priority: z
    .number()
    .optional()
    .default(0)
    .openapi({
      description: 'Promptun birleştirilme önceliği (Küçük sayılar önce eklenir)',
      example: 10,
    }),
});

export const updatePromptSchema = createPromptSchema.partial();

export const promptQuerySchema = z.object({
  type: promptTypeSchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  is_active: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type CreatePromptDto = z.infer<typeof createPromptSchema>;
export type UpdatePromptDto = z.infer<typeof updatePromptSchema>;
export type PromptQueryDto = z.infer<typeof promptQuerySchema>;
