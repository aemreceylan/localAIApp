import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { env } from '#config/env.config.js';
import {
  chatMessageSchema,
  chatRequestSchema,
  createSessionSchema,
  modelInfoSchema,
  modelListResponseSchema,
} from '#modules/chat/chat.dto.js';
import {
  createPromptSchema,
  updatePromptSchema,
} from '#modules/prompt/prompt.dto.js';
import {
  setupSuperAdminSchema,
  loginSchema,
  setupStatusResponseSchema,
  authResponseSchema,
  userResponseSchema,
} from '#modules/auth/auth.dto.js';

// Zod'u OpenAPI desteğiyle genişlet
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Standart Hata Şeması
export const errorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    success: z.literal(false).openapi({ example: false }),
    error: z.object({
      code: z.string().openapi({ example: 'NOT_FOUND' }),
      message: z.string().openapi({ example: 'Kaynak bulunamadı.' }),
      details: z.any().optional(),
    }),
  })
);

// Çok Kiracılılık (Multi-Tenancy) Header Parametresi
export const tenantHeaderParameter = {
  name: 'x-tenant-id',
  in: 'header' as const,
  required: false,
  schema: {
    type: 'string' as const,
    default: 'default-tenant',
  },
  description:
    'Çok kiracılı (Multi-Tenancy) veri izolasyonu için Kiracı ID. Belirtilmezse varsayılan kiracı (default-tenant) kullanılır.',
  example: 'default-tenant',
};

registry.registerComponent('parameters', 'TenantIdHeader', tenantHeaderParameter);

// 1. Health Check Endpoint
registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Sistem'],
  summary: 'Sistem Sağlık Kontrolü',
  description: 'API sunucusunun aktif çalışma durumunu ve çalışma süresini döndürür.',
  responses: {
    200: {
      description: 'Sunucu sağlıklı ve istekleri kabul ediyor.',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ok').openapi({ example: 'ok' }),
            timestamp: z.string().openapi({ example: '2026-09-29T10:00:00.000Z' }),
            uptime: z.number().openapi({ example: 120.45 }),
          }),
        },
      },
    },
  },
});

// Güvenlik Şeması: Opaque Bearer Token
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'Opaque Token',
  description: 'Giriş ve ilk kurulum sonrası dönen nx_live_... biçimindeki Opaque Bearer token',
});

// 2. Chat, Prompt & Auth DTO'larını Registry'ye Kaydet
registry.register('ChatMessage', chatMessageSchema);
registry.register('ChatRequest', chatRequestSchema);
registry.register('CreateSessionRequest', createSessionSchema);
registry.register('CreatePromptRequest', createPromptSchema);
registry.register('UpdatePromptRequest', updatePromptSchema);
registry.register('SetupSuperAdminRequest', setupSuperAdminSchema);
registry.register('LoginRequest', loginSchema);
registry.register('SetupStatusResponse', setupStatusResponseSchema);
registry.register('UserResponse', userResponseSchema);
registry.register('AuthResponse', authResponseSchema);

// 3. Chat Streaming Endpoint
registry.registerPath({
  method: 'post',
  path: '/api/chat',
  tags: ['Sohbet & LLM'],
  summary: 'Canlı LLM Sohbet Akışı (Streaming & Persistence)',
  description:
    'Kullanıcı mesaj geçmişini alır. Eğer conversationId belirtilmişse mesajları MongoDB oturumuna kaydeder ve Ollama üzerinden anlık token akışı (Data Stream) başlatır.',
  parameters: [tenantHeaderParameter],
  request: {
    body: {
      description: 'Sohbet isteği parametreleri',
      required: true,
      content: {
        'application/json': {
          schema: chatRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Canlı veri akışı (Vercel AI SDK Data Stream protocol)',
      content: {
        'text/plain': {
          schema: z.string().openapi({
            description: 'İstemciye ardışık parçalar (chunks) halinde iletilen token akışı.',
          }),
        },
      },
    },
    422: {
      description: 'İstek gövdesi doğrulama hatası (Validation Error)',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    502: {
      description: 'Model servis sağlayıcısı (Ollama) bağlantı hatası',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// 4. Sohbet Oturumu Oluşturma
registry.registerPath({
  method: 'post',
  path: '/api/chat/sessions',
  tags: ['Sohbet Oturumları (Sessions)'],
  summary: 'Yeni Sohbet Oturumu Oluştur',
  description: 'Tenant için yeni bir konuşma başlığı ve modeliyle oturum (thread) kaydı oluşturur.',
  parameters: [tenantHeaderParameter],
  request: {
    body: {
      description: 'Oturum oluşturma parametreleri',
      required: false,
      content: {
        'application/json': {
          schema: createSessionSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Oturum başarıyla oluşturuldu.',
    },
    422: {
      description: 'Geçersiz parametreler',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// 5. Sohbet Oturumlarını Listeleme
registry.registerPath({
  method: 'get',
  path: '/api/chat/sessions',
  tags: ['Sohbet Oturumları (Sessions)'],
  summary: 'Sohbet Oturumlarını Listele',
  description: 'Aktif kiracıya (tenant) ait tüm geçmiş oturumları en yeniden eskiye listeler.',
  parameters: [tenantHeaderParameter],
  responses: {
    200: {
      description: 'Oturum listesi',
    },
  },
});

// 6. Tekil Oturum Detayı Getirme
registry.registerPath({
  method: 'get',
  path: '/api/chat/sessions/{id}',
  tags: ['Sohbet Oturumları (Sessions)'],
  summary: 'Tekil Sohbet Oturumu Detayı',
  description: 'Belirtilen ID değerine sahip oturumun detaylarını getirir.',
  parameters: [
    tenantHeaderParameter,
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Oturum ID (MongoDB ObjectId)',
    },
  ],
  responses: {
    200: {
      description: 'Oturum detayı',
    },
    404: {
      description: 'Oturum bulunamadı',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// 7. Oturum Mesajlarını Getirme
registry.registerPath({
  method: 'get',
  path: '/api/chat/sessions/{id}/messages',
  tags: ['Sohbet Oturumları (Sessions)'],
  summary: 'Oturum Mesaj Geçmişini Getir',
  description: 'Belirtilen oturum ID için tüm kullanıcı ve asistan mesajlarını kronolojik sırada getirir.',
  parameters: [
    tenantHeaderParameter,
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Oturum ID (MongoDB ObjectId)',
    },
  ],
  responses: {
    200: {
      description: 'Mesaj geçmişi listesi',
    },
    404: {
      description: 'Oturum bulunamadı',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// 8. Oturum Silme
registry.registerPath({
  method: 'delete',
  path: '/api/chat/sessions/{id}',
  tags: ['Sohbet Oturumları (Sessions)'],
  summary: 'Sohbet Oturumunu Sil',
  description: 'Oturumu ve bağlı tüm mesajları kalıcı olarak siler.',
  parameters: [
    tenantHeaderParameter,
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Oturum ID (MongoDB ObjectId)',
    },
  ],
  responses: {
    200: {
      description: 'Oturum başarıyla silindi.',
    },
    404: {
      description: 'Oturum bulunamadı',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// 8.1. Aktif LLM Modellerini Listeleme
registry.register('ModelInfo', modelInfoSchema);
registry.registerPath({
  method: 'get',
  path: '/api/chat/models',
  tags: ['Sohbet & LLM'],
  summary: 'Kullanılabilir LLM Modellerini Listele',
  description: 'Sistemde kayıtlı AI sağlayıcılarından (Ollama, vLLM, OpenAI vb.) anlık olarak kullanılabilir dil modellerini ve varsa varsayılan modeli listeler.',
  parameters: [tenantHeaderParameter],
  responses: {
    200: {
      description: 'Kullanılabilir model listesi',
      content: {
        'application/json': {
          schema: modelListResponseSchema,
        },
      },
    },
  },
});

// 9. Prompt Yönetimi (Dinamik Çok Katmanlı Prompt Stacking)
registry.registerPath({
  method: 'post',
  path: '/api/prompts',
  tags: ['Prompt Yönetimi (Dinamik Prompt Stacking)'],
  summary: 'Yeni Prompt / Persona / Guardrail Oluştur',
  description: 'Sisteme yeni bir kurumsal guardrail kuralı, uzmanlık personasi veya özel prompt şablonu ekler.',
  parameters: [tenantHeaderParameter],
  request: {
    body: {
      description: 'Prompt oluşturma verisi',
      required: true,
      content: {
        'application/json': {
          schema: createPromptSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Prompt başarıyla oluşturuldu.',
    },
    422: {
      description: 'Geçersiz parametreler veya doğrulama hatası',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/prompts',
  tags: ['Prompt Yönetimi (Dinamik Prompt Stacking)'],
  summary: 'Promptları Listele',
  description: 'Kiracıya (tenant) ait promptları filtreleyerek listeler.',
  parameters: [
    tenantHeaderParameter,
    {
      name: 'type',
      in: 'query',
      required: false,
      schema: { type: 'string', enum: ['system_guardrail', 'persona', 'custom'] },
      description: 'Prompt tipi filtresi',
    },
    {
      name: 'isActive',
      in: 'query',
      required: false,
      schema: { type: 'boolean' },
      description: 'Aktiflik durumu filtresi',
    },
  ],
  responses: {
    200: {
      description: 'Prompt listesi',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/prompts/{id}',
  tags: ['Prompt Yönetimi (Dinamik Prompt Stacking)'],
  summary: 'Tekil Prompt Detayı',
  description: 'Belirtilen ID değerine sahip promptun detaylarını getirir.',
  parameters: [
    tenantHeaderParameter,
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Prompt ID',
    },
  ],
  responses: {
    200: {
      description: 'Prompt detayı',
    },
    404: {
      description: 'Prompt bulunamadı',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/prompts/{id}',
  tags: ['Prompt Yönetimi (Dinamik Prompt Stacking)'],
  summary: 'Prompt Güncelle',
  description: 'Var olan bir promptun metnini, aktiflik durumunu veya önceliğini günceller.',
  parameters: [
    tenantHeaderParameter,
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Prompt ID',
    },
  ],
  request: {
    body: {
      description: 'Güncellenecek prompt alanları',
      required: true,
      content: {
        'application/json': {
          schema: updatePromptSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Prompt başarıyla güncellendi.',
    },
    404: {
      description: 'Prompt bulunamadı',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/prompts/{id}',
  tags: ['Prompt Yönetimi (Dinamik Prompt Stacking)'],
  summary: 'Prompt Sil',
  description: 'Belirtilen promptu kalıcı olarak siler.',
  parameters: [
    tenantHeaderParameter,
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Prompt ID',
    },
  ],
  responses: {
    200: {
      description: 'Prompt başarıyla silindi.',
    },
    404: {
      description: 'Prompt bulunamadı',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// 10. Kimlik Doğrulama & Oturum Yönetimi (Opaque Bearer Token & Bootstrap)
registry.registerPath({
  method: 'get',
  path: '/api/auth/setup-status',
  tags: ['Kimlik Doğrulama & Oturum (Auth)'],
  summary: 'İlk Kurulum Durumu Kontrolü (Bootstrap)',
  description: 'Sistemde henüz bir Super Admin kullanıcısının bulunup bulunmadığını kontrol eder. İlk kurulum gerekiyorsa true döner.',
  responses: {
    200: {
      description: 'Kurulum durumu',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: setupStatusResponseSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/setup',
  tags: ['Kimlik Doğrulama & Oturum (Auth)'],
  summary: 'İlk Super Admin Kurulumu (Tek Seferlik)',
  description: 'Sistem ilk açıldığında doğrudan kayıt olabilecek tek kullanıcı olan Super Admin hesabını oluşturur. Super Admin zaten varsa 403 Forbidden döner.',
  request: {
    body: {
      description: 'Super Admin bilgileri ve opsiyonel organizasyon adı',
      required: true,
      content: {
        'application/json': {
          schema: setupSuperAdminSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Super Admin oluşturuldu ve oturum açıldı.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: authResponseSchema,
          }),
        },
      },
    },
    403: {
      description: 'Sistem kurulumu zaten tamamlanmış (Doğrudan kayıt kilitli)',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Kimlik Doğrulama & Oturum (Auth)'],
  summary: 'Kullanıcı Girişi (Login)',
  description: 'E-posta ve parola ile giriş yapar, Opaque Bearer Token (`nx_live_...`) üretir.',
  request: {
    body: {
      description: 'Giriş bilgileri',
      required: true,
      content: {
        'application/json': {
          schema: loginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Giriş başarılı, oturum oluşturuldu.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: authResponseSchema,
          }),
        },
      },
    },
    401: {
      description: 'Geçersiz e-posta veya parola',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags: ['Kimlik Doğrulama & Oturum (Auth)'],
  summary: 'Oturumu Kapat (Logout)',
  description: 'Mevcut Opaque Bearer token oturumunu veritabanından kalıcı olarak siler ve anında geçersiz kılar.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Oturum başarıyla kapatıldı.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ message: z.string() }),
          }),
        },
      },
    },
    401: {
      description: 'Yetkisiz erişim veya geçersiz token',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags: ['Kimlik Doğrulama & Oturum (Auth)'],
  summary: 'Aktif Kullanıcı Bilgisi',
  description: 'Bearer token üzerinden oturum açmış aktif kullanıcının profil ve rol bilgilerini döndürür.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Kullanıcı profil bilgisi',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: userResponseSchema,
          }),
        },
      },
    },
    401: {
      description: 'Yetkisiz erişim veya geçersiz token',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'NexusAI Gateway & Knowledge Base API',
      version: '1.0.0',
      description:
        'Kurumsal LLM Orkestrasyonu, Yerel Modeller (Ollama), Bulut Modeller ve RAG Ağ Geçidi API Dokümantasyonu',
      contact: {
        name: 'NexusAI Platform Team',
      },
    },
    servers: [
      {
        url: `http://${env.HOST}:${env.PORT}`,
        description: 'Mevcut Backend Sunucusu',
      },
    ],
  });
}

/**
 * Üretilen OpenAPI spesifikasyonunu diske döküman dosyası (JSON) olarak kaydeder.
 * Varsayılan olarak hem master documents/ dizinine hem de backend/docs dizinine yazar.
 */
export function saveOpenApiDocument(customPath?: string): string {
  const doc = generateOpenApiDocument();
  const jsonContent = JSON.stringify(doc, null, 2);

  if (customPath) {
    const dir = path.dirname(customPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(customPath, jsonContent, 'utf-8');
    return customPath;
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  // 1. Master documents/ dizinine kaydet (WorkspaceRoot/documents/openapi.json)
  const masterPath = path.resolve(currentDir, '../../../../documents/openapi.json');
  try {
    const masterDir = path.dirname(masterPath);
    if (!fs.existsSync(masterDir)) fs.mkdirSync(masterDir, { recursive: true });
    fs.writeFileSync(masterPath, jsonContent, 'utf-8');
  } catch (err) {
    console.warn('[OpenAPI] Master documents dizinine yazılamadı, yerel dizin deneniyor.', err);
  }

  // 2. apps/backend/docs/ dizinine kaydet (Backend'e özel kopya)
  const localPath = path.resolve(currentDir, '../../docs/openapi.json');
  const localDir = path.dirname(localPath);
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(localPath, jsonContent, 'utf-8');

  return masterPath;
}

