/**
 * @file rag-config.dto.ts
 * @description Admin RAG ve BullMQ Yapılandırma Zod DTO Şemaları.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/**
 * RAG ve Kuyruk Ayarları Okuma Şeması
 */
export const ragConfigResponseSchema = z
  .object({
    concurrency: z.number().int().min(1).max(10).openapi({
      description: 'Arka plan işçisinin eşzamanlı işleyebileceği maksimum doküman sayısı',
      example: 2,
    }),
    attempts: z.number().int().min(1).max(10).openapi({
      description: 'Hata durumunda işin yeniden denenme sayısı',
      example: 3,
    }),
    backoff_delay_ms: z.number().int().min(500).max(60000).openapi({
      description: 'Üstel geri çekilme başlangıç gecikme süresi (milisaniye)',
      example: 2000,
    }),
    chunk_size: z.number().int().min(100).max(8000).openapi({
      description: 'Doküman metin parçalama boyutu (karakter)',
      example: 1000,
    }),
    chunk_overlap: z.number().int().min(0).max(2000).openapi({
      description: 'Ardışık parçalar arasındaki örtüşme miktarı (karakter)',
      example: 200,
    }),
    remove_on_complete_count: z.number().int().min(10).max(10000).openapi({
      description: 'Başarıyla tamamlanan ve saklanacak maksimum iş sayısı',
      example: 1000,
    }),
    remove_on_fail_count: z.number().int().min(10).max(50000).openapi({
      description: 'Başarısız olan ve inceleme için saklanacak maksimum iş sayısı',
      example: 5000,
    }),
    updated_at: z.date().optional().openapi({
      description: 'Son güncelleme zamanı',
    }),
  })
  .openapi({
    description: 'RAG ve BullMQ kuyruk yapılandırma parametreleri',
  });

/**
 * Admin RAG ve Kuyruk Ayarları Güncelleme Şeması
 */
export const updateRagConfigSchema = z
  .object({
    concurrency: z.number().int().min(1, 'Eşzamanlılık en az 1 olmalıdır.').max(10, 'Eşzamanlılık en fazla 10 olabilir.').optional(),
    attempts: z.number().int().min(1, 'Deneme sayısı en az 1 olmalıdır.').max(10, 'Deneme sayısı en fazla 10 olabilir.').optional(),
    backoff_delay_ms: z.number().int().min(500, 'Gecikme en az 500ms olmalıdır.').max(60000, 'Gecikme en fazla 60000ms olabilir.').optional(),
    chunk_size: z.number().int().min(100, 'Parça boyutu en az 100 karakter olmalıdır.').max(8000, 'Parça boyutu en fazla 8000 karakter olabilir.').optional(),
    chunk_overlap: z.number().int().min(0, 'Örtüşme en az 0 olmalıdır.').max(2000, 'Örtüşme en fazla 2000 karakter olabilir.').optional(),
    remove_on_complete_count: z.number().int().min(10).max(10000).optional(),
    remove_on_fail_count: z.number().int().min(10).max(50000).optional(),
  })
  .refine(
    (data) => {
      if (data.chunk_size !== undefined && data.chunk_overlap !== undefined) {
        return data.chunk_overlap < data.chunk_size;
      }
      return true;
    },
    {
      message: 'chunk_overlap değeri chunk_size değerinden küçük olmalıdır.',
      path: ['chunk_overlap'],
    }
  )
  .openapi({
    description: 'Admin RAG ve BullMQ ayarlarını güncelleme gövdesi',
    example: {
      concurrency: 3,
      attempts: 4,
      backoff_delay_ms: 3000,
      chunk_size: 1200,
      chunk_overlap: 250,
    },
  });

export type RagConfigResponse = z.infer<typeof ragConfigResponseSchema>;
export type UpdateRagConfigInput = z.infer<typeof updateRagConfigSchema>;
