import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Zod'u OpenAPI desteğiyle donat
extendZodWithOpenApi(z);

export const chatMessageSchema = z.object({
  role: z
    .enum(['user', 'assistant', 'system'], {
      required_error: 'Mesaj rolü (user, assistant, system) zorunludur.',
    })
    .openapi({
      description: 'Mesajı gönderen aktörün rolü',
      example: 'user',
    }),
  content: z
    .string()
    .min(1, 'Mesaj içeriği boş olamaz.')
    .openapi({
      description: 'Mesaj içeriği metni',
      example: 'Merhaba! Kurumsal LLM mimarisi hakkında bilgi verir misin?',
    }),
});

export const chatRequestSchema = z.object({
  conversationId: z
    .string()
    .optional()
    .openapi({
      description: 'Mesajın bağlanacağı kayıtlı oturum ID (ObjectId). Boş ise oturumsuz anlık sohbet çalışır.',
      example: '66f7d540e11893c5d808e9a2',
    }),
  messages: z
    .array(chatMessageSchema)
    .min(1, 'En az bir mesaj gönderilmelidir.')
    .openapi({
      description: 'Oturuma ait mesaj geçmişi listesi',
    }),
  model: z
    .string()
    .optional()
    .openapi({
      description: 'Kullanılacak model adı. Oturum ID belirtilmediyse istek gövdesinde verilmesi zorunludur.',
      example: 'llama3.2:3b',
    }),
  temperature: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .openapi({
      description: 'Modelin yanıt üretirken sergileyeceği yaratıcılık katsayısı (0.0 - 2.0).',
      example: 0.7,
    }),
  promptId: z
    .string()
    .optional()
    .openapi({
      description: 'Kullanılacak persona/rol prompt ID. Belirtilmezse tenant varsayılan persona kullanılır.',
      example: '66f7d540e11893c5d808e9a2',
    }),
  customInstructions: z
    .string()
    .max(2000, 'Özel talimatlar 2000 karakterden uzun olamaz.')
    .optional()
    .openapi({
      description: 'Kullanıcının anlık veya oturuma özel ek talimatı',
      example: 'Her zaman maddeler halinde ve Türkçe özetle.',
    }),
  systemPrompt: z
    .string()
    .optional()
    .openapi({
      description: 'Geriye dönük uyumluluk: Doğrudan metin olarak sistem talimatı.',
      example: 'Sen kurumsal bir AI asistanısın.',
    }),
});

export const createSessionSchema = z.object({
  title: z
    .string()
    .max(200, 'Başlık 200 karakterden uzun olamaz.')
    .optional()
    .openapi({
      description: 'Sohbet oturumunun başlığı',
      example: 'Finans Raporu Analizi',
    }),
  model: z
    .string({ required_error: 'Model seçimi zorunludur.' })
    .min(1, 'Model adı boş olamaz.')
    .openapi({
      description: 'Oturum için seçilen model adı (Zorunlu)',
      example: 'llama3.2:3b',
    }),
  promptId: z
    .string()
    .optional()
    .openapi({
      description: 'Oturuma bağlanacak persona/rol prompt ID (ObjectId). Boş ise varsayılan persona kullanılır.',
      example: '66f7d540e11893c5d808e9a2',
    }),
  customInstructions: z
    .string()
    .max(2000, 'Özel talimatlar 2000 karakterden uzun olamaz.')
    .optional()
    .openapi({
      description: 'Oturuma özel kullanıcı ek talimatı',
      example: 'Finansal terimleri açıklayarak yanıt ver.',
    }),
  systemPrompt: z
    .string()
    .optional()
    .openapi({
      description: 'Geriye dönük uyumluluk: Doğrudan metin olarak sistem talimatı.',
      example: 'Finans uzmanı olarak yanıt ver.',
    }),
});

export type ChatMessageDto = z.infer<typeof chatMessageSchema>;
export type ChatRequestDto = z.infer<typeof chatRequestSchema>;
export type CreateSessionDto = z.infer<typeof createSessionSchema>;
