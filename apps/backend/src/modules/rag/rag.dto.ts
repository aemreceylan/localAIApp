/**
 * @file rag.dto.ts
 * @description RAG Bilgi Bankası ve Vektör Arama Modülü İçin Tip Güvenli Zod DTO Şemaları ve OpenAPI Tanımları.
 * İstemciden gelen dosya yükleme, rol güncelleme, doküman sorgulama ve semantik vektör arama
 * isteklerinin uç nokta doğrulamalarını gerçekleştirir.
 *
 * @example
 * ```typescript
 * import { ragQuerySchema, updateDocumentRolesSchema } from '#modules/rag/rag.dto.js';
 *
 * const validatedQuery = ragQuerySchema.parse(req.body);
 * const validatedRoles = updateDocumentRolesSchema.parse(req.body);
 * ```
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/**
 * Doküman işleme durumu şeması
 */
export const documentStatusSchema = z
  .enum(['pending', 'processing', 'completed', 'failed'], {
    errorMap: () => ({
      message: "Doküman durumu yalnızca 'pending', 'processing', 'completed' veya 'failed' olabilir.",
    }),
  })
  .openapi({
    description: 'Doküman indeksleme ve parçalama yaşam döngüsü durumu',
    example: 'completed',
  });

/**
 * Doküman yükleme üst veri (metadata) gövde şeması (Multipart/form-data ile birlikte gönderilir)
 */
export const uploadDocumentMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .max(200, 'Doküman başlığı en fazla 200 karakter olabilir.')
    .optional()
    .openapi({
      description: 'Dokümanın kurumsal başlığı (boş bırakılırsa orijinal dosya adı kullanılır)',
      example: '2026 Kurumsal İK Yönetmeliği',
    }),
  allowed_roles: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === '') {
        return ['*'];
      }
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return val.split(',').map((item) => item.trim()).filter(Boolean);
        }
      }
      return val;
    }, z.array(z.string().min(1, 'Rol adı boş olamaz.')).default(['*']))
    .openapi({
      description: "Dokümana erişebilecek departman rolleri dizisi (örn: ['hr', 'legal'] veya ['*'])",
      example: ['hr', 'manager'],
    }),
});

/**
 * Doküman erişim rolleri güncelleme şeması (Document ACL)
 */
export const updateDocumentRolesSchema = z.object({
  allowed_roles: z
    .array(z.string().trim().min(1, 'Rol adı boş olamaz.'), {
      required_error: 'allowed_roles dizisi zorunludur.',
    })
    .min(1, 'En az bir rol veya genel erişim için ["*"] belirtilmelidir.')
    .openapi({
      description: "Dokümana erişebilecek rollerin güncel listesi (Örn: ['*'] veya ['developer', 'hr'])",
      example: ['developer'],
    }),
});

/**
 * Dokümanları listeleme ve filtreleme sorgu parametreleri (Query Params)
 */
export const listDocumentsQuerySchema = z.object({
  status: documentStatusSchema.optional(),
  search: z.string().trim().optional().openapi({
    description: 'Doküman başlığı veya dosya adında aranacak metin',
    example: 'yönetmelik',
  }),
  page: z.coerce
    .number({ invalid_type_error: 'Sayfa numarası geçerli bir sayı olmalıdır.' })
    .int('Sayfa tam sayı olmalıdır.')
    .min(1, 'Sayfa en az 1 olmalıdır.')
    .default(1)
    .openapi({ description: 'Sayfa numarası', example: 1 }),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit geçerli bir sayı olmalıdır.' })
    .int('Limit tam sayı olmalıdır.')
    .min(1, 'Limit en az 1 olmalıdır.')
    .max(100, 'Limit en fazla 100 olabilir.')
    .default(20)
    .openapi({ description: 'Sayfa başına getirilecek doküman sayısı', example: 20 }),
});

/**
 * RAG Semantik Vektör Arama Sorgu Şeması
 */
export const ragQuerySchema = z.object({
  query: z
    .string({ required_error: 'Arama sorgu metni zorunludur.' })
    .trim()
    .min(1, 'Arama sorgusu boş olamaz.')
    .max(2000, 'Arama sorgusu en fazla 2000 karakter olabilir.')
    .openapi({
      description: 'Vektör benzerlik araması yapılacak kullanıcı sorusu veya arama ifadesi',
      example: 'Yıllık izin devir şartları ve kıdem süreleri nelerdir?',
    }),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Sonuç limiti en az 1 olmalıdır.')
    .max(20, 'Sonuç limiti en fazla 20 olabilir.')
    .default(5)
    .optional()
    .openapi({
      description: 'Döndürülecek en benzer metin parçası (chunk) adedi',
      example: 5,
    }),
  score_threshold: z.coerce
    .number()
    .min(0, 'Eşik skoru 0 veya üzerinde olmalıdır.')
    .max(1, 'Eşik skoru 1 veya altında olmalıdır.')
    .default(0.5)
    .optional()
    .openapi({
      description: 'Minimum benzerlik cosine skoru (0.0 - 1.0)',
      example: 0.65,
    }),
});

/**
 * TypeScript Tipleri
 */
export type UploadDocumentMetadataInput = z.infer<typeof uploadDocumentMetadataSchema>;
export type UpdateDocumentRolesInput = z.infer<typeof updateDocumentRolesSchema>;
export type ListDocumentsQueryInput = z.infer<typeof listDocumentsQuerySchema>;
export type RagQueryInput = z.infer<typeof ragQuerySchema>;
