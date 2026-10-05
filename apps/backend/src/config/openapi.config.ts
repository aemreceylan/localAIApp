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
  transferSuperAdminSchema,
  assignAdminSchema,
  assignRolesSchema,
  banUserSchema,
  overridePermissionsSchema,
} from '#modules/auth/auth.dto.js';
import {
  createRoleSchema,
  updateRolePermissionsSchema,
  setDefaultRoleSchema,
  roleResponseSchema,
} from '#modules/role/role.dto.js';

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

// Güvenlik Şeması: Opaque Bearer Token
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'Opaque Token',
  description: 'Giriş ve ilk kurulum sonrası dönen nx_live_... biçimindeki Opaque Bearer token',
});

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
            timestamp: z.string().openapi({ example: '2026-10-02T10:00:00.000Z' }),
            uptime: z.number().openapi({ example: 120.45 }),
          }),
        },
      },
    },
  },
});

// 2. DTO'ları Registry'ye Kaydet
registry.register('ChatMessage', chatMessageSchema);
registry.register('ChatRequest', chatRequestSchema);
registry.register('CreateSessionRequest', createSessionSchema);
registry.register('ModelInfo', modelInfoSchema);
registry.register('CreatePromptRequest', createPromptSchema);
registry.register('UpdatePromptRequest', updatePromptSchema);
registry.register('SetupSuperAdminRequest', setupSuperAdminSchema);
registry.register('LoginRequest', loginSchema);
registry.register('SetupStatusResponse', setupStatusResponseSchema);
registry.register('UserResponse', userResponseSchema);
registry.register('AuthResponse', authResponseSchema);
registry.register('TransferSuperAdminRequest', transferSuperAdminSchema);
registry.register('AssignAdminRequest', assignAdminSchema);
registry.register('AssignRolesRequest', assignRolesSchema);
registry.register('BanUserRequest', banUserSchema);
registry.register('OverridePermissionsRequest', overridePermissionsSchema);
registry.register('CreateRoleRequest', createRoleSchema);
registry.register('UpdateRolePermissionsRequest', updateRolePermissionsSchema);
registry.register('SetDefaultRoleRequest', setDefaultRoleSchema);
registry.register('RoleResponse', roleResponseSchema);

// ==========================================
// 3. Sohbet & LLM Rotaları
// ==========================================
registry.registerPath({
  method: 'post',
  path: '/api/chat',
  tags: ['Sohbet & LLM'],
  summary: 'Canlı LLM Sohbet Akışı (Streaming & Persistence)',
  description:
    'Kullanıcı mesaj geçmişini alır. Eğer conversationId belirtilmişse mesajları MongoDB oturumuna kaydeder ve LLM sağlayıcısı üzerinden anlık token akışı (Data Stream) başlatır.',
  security: [{ bearerAuth: [] }],
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
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    502: {
      description: 'Model servis sağlayıcısı bağlantı hatası',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/chat/sessions',
  tags: ['Sohbet Oturumları (Sessions)'],
  summary: 'Yeni Sohbet Oturumu Oluştur',
  description: 'Aktif kullanıcı için yeni bir konuşma başlığı ve modeliyle oturum (thread) kaydı oluşturur.',
  security: [{ bearerAuth: [] }],
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

registry.registerPath({
  method: 'get',
  path: '/api/chat/sessions',
  tags: ['Sohbet Oturumları (Sessions)'],
  summary: 'Sohbet Oturumlarını Listele',
  description: 'Aktif kullanıcıya ait tüm geçmiş oturumları en yeniden eskiye listeler.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Oturum listesi',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/chat/sessions/{id}',
  tags: ['Sohbet Oturumları (Sessions)'],
  summary: 'Tekil Sohbet Oturumu Detayı',
  description: 'Belirtilen ID değerine sahip oturumun detaylarını getirir.',
  security: [{ bearerAuth: [] }],
  parameters: [
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

registry.registerPath({
  method: 'get',
  path: '/api/chat/sessions/{id}/messages',
  tags: ['Sohbet Oturumları (Sessions)'],
  summary: 'Oturum Mesaj Geçmişini Getir',
  description: 'Belirtilen oturum ID için tüm kullanıcı ve asistan mesajlarını kronolojik sırada getirir.',
  security: [{ bearerAuth: [] }],
  parameters: [
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

registry.registerPath({
  method: 'delete',
  path: '/api/chat/sessions/{id}',
  tags: ['Sohbet Oturumları (Sessions)'],
  summary: 'Sohbet Oturumunu Sil',
  description: 'Oturumu ve bağlı tüm mesajları kalıcı olarak siler.',
  security: [{ bearerAuth: [] }],
  parameters: [
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

registry.registerPath({
  method: 'get',
  path: '/api/chat/models',
  tags: ['Sohbet & LLM'],
  summary: 'Kullanılabilir LLM Modellerini Listele',
  description: 'Sistemde kayıtlı AI sağlayıcılarından (Ollama, vLLM, OpenAI vb.) anlık olarak kullanılabilir dil modellerini listeler.',
  security: [{ bearerAuth: [] }],
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

// ==========================================
// 4. Prompt Yönetimi (Dinamik Prompt Stacking & Rol İzolasyonu)
// ==========================================
registry.registerPath({
  method: 'post',
  path: '/api/prompts',
  tags: ['Prompt Yönetimi (Dinamik Prompt Stacking)'],
  summary: 'Yeni Prompt / Persona / Guardrail Oluştur',
  description: 'Sisteme yeni bir kurumsal guardrail kuralı, uzmanlık personasi veya departman bazlı prompt şablonu ekler.',
  security: [{ bearerAuth: [] }],
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
  description: 'Kullanıcının departman ve fonksiyonel rollerine göre filtrelenmiş promptları listeler.',
  security: [{ bearerAuth: [] }],
  parameters: [
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
  security: [{ bearerAuth: [] }],
  parameters: [
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
  description: 'Var olan bir promptun metnini, aktiflik durumunu, önceliğini veya erişim rollerini günceller.',
  security: [{ bearerAuth: [] }],
  parameters: [
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
  security: [{ bearerAuth: [] }],
  parameters: [
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

// ==========================================
// 5. Kimlik Doğrulama & Oturum Yönetimi (Auth)
// ==========================================
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
      description: 'Super Admin bilgileri',
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
    403: {
      description: 'Kullanıcı hesabı askıya alınmış/banlanmış',
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
  description: 'Bearer token üzerinden oturum açmış aktif kullanıcının profil, sistem rolü ve fonksiyonel departman rollerini döndürür.',
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

// ==========================================
// 6. Superadmin & Admin Yetki Yönetimi
// ==========================================
registry.registerPath({
  method: 'post',
  path: '/api/auth/superadmin/transfer',
  tags: ['Kurumsal RBAC & Yönetim'],
  summary: 'Superadmin Yetkisini Devret (Transfer Superadmin)',
  description: 'Yalnızca mevcut Superadmin tarafından çalıştırılabilir. Parola doğrulaması sonrasında superadminlik rolü hedef kullanıcıya devreder.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Hedef kullanıcı ID ve mevcut superadmin onay parolası',
      required: true,
      content: { 'application/json': { schema: transferSuperAdminSchema } },
    },
  },
  responses: {
    200: {
      description: 'Superadmin yetkisi başarıyla devredildi.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
          }),
        },
      },
    },
    403: {
      description: 'Yetkisiz (Sadece mevcut Superadmin devredebilir)',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/admin/assign',
  tags: ['Kurumsal RBAC & Yönetim'],
  summary: 'Admin Rolü Ata',
  description: 'Yalnızca Superadmin tarafından çalıştırılabilir. Bir kullanıcıya sistem düzeyinde admin rolü atar.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Hedef kullanıcı ID',
      required: true,
      content: { 'application/json': { schema: assignAdminSchema } },
    },
  },
  responses: {
    200: {
      description: 'Admin rolü başarıyla atandı.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: userResponseSchema,
          }),
        },
      },
    },
    403: {
      description: 'Yalnızca Superadmin admin atayabilir.',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/admin/revoke',
  tags: ['Kurumsal RBAC & Yönetim'],
  summary: 'Admin Rolünü Geri Al',
  description: 'Yalnızca Superadmin tarafından çalıştırılabilir. Admin rolünü geri alır ve kullanıcıyı standart "user" seviyesine çeker.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Hedef kullanıcı ID',
      required: true,
      content: { 'application/json': { schema: assignAdminSchema } },
    },
  },
  responses: {
    200: {
      description: 'Admin rolü geri alındı.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: userResponseSchema,
          }),
        },
      },
    },
    403: {
      description: 'Yalnızca Superadmin admin rolünü geri alabilir.',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/users',
  tags: ['Kurumsal RBAC & Yönetim'],
  summary: 'Kullanıcıları Listele',
  description: 'Sistemdeki tüm kayıtlı kullanıcıları listeler. (Yetki: user:read)',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Kullanıcı listesi',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(userResponseSchema),
          }),
        },
      },
    },
    403: {
      description: 'Yetki yetersiz.',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/users/{id}/ban',
  tags: ['Kurumsal RBAC & Yönetim'],
  summary: 'Kullanıcıyı Yasakla / Askıya Al (Ban)',
  description: 'Kullanıcının hesabını devre dışı bırakır ve açık tüm oturumlarını anında iptal eder. Superadmin yasaklanamaz. (Yetki: user:ban)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Kullanıcı ID',
    },
  ],
  responses: {
    200: {
      description: 'Kullanıcı başarıyla yasaklandı ve tüm oturumları iptal edildi.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: userResponseSchema,
          }),
        },
      },
    },
    403: {
      description: 'Superadmin yasaklanamaz veya yetki yetersiz.',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/users/{id}/unban',
  tags: ['Kurumsal RBAC & Yönetim'],
  summary: 'Kullanıcı Yasağını Kaldır (Unban)',
  description: 'Kullanıcının hesabını tekrar aktif hale getirir. (Yetki: user:unban)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Kullanıcı ID',
    },
  ],
  responses: {
    200: {
      description: 'Kullanıcı hesabı tekrar aktif edildi.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: userResponseSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/auth/users/{id}/roles',
  tags: ['Kurumsal RBAC & Yönetim'],
  summary: 'Kullanıcı Fonksiyonel Rollerini Güncelle',
  description: 'Kullanıcının kurum içi departman rollerini (hr, developer, finance vb.) günceller ve oturumlarını anında yeniler. (Yetki: user:manage_roles)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Kullanıcı ID',
    },
  ],
  request: {
    body: {
      description: 'Yeni atanacak roller listesi',
      required: true,
      content: {
        'application/json': {
          schema: z.object({
            roles: z.array(z.string()).min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Kullanıcı rolleri başarıyla güncellendi.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: userResponseSchema,
          }),
        },
      },
    },
  },
});

// ==========================================
// 7. Dinamik Rol ve İzin Yönetimi (OCP Engine)
// ==========================================
registry.registerPath({
  method: 'get',
  path: '/api/roles',
  tags: ['Rol ve İzin Yönetimi (OCP Engine)'],
  summary: 'Tanımlı Rolleri Listele',
  description: 'Sistemde kayıtlı varsayılan ve dinamik olarak eklenmiş departman rollerini listeler.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Rol listesi',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(roleResponseSchema),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/roles',
  tags: ['Rol ve İzin Yönetimi (OCP Engine)'],
  summary: 'Yeni Departman / Fonksiyonel Rol Oluştur',
  description: 'Kurum için yeni bir rol ve bu role ait izinler tanımlar. (Yetki: user:manage_roles)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Rol tanımlama verisi',
      required: true,
      content: { 'application/json': { schema: createRoleSchema } },
    },
  },
  responses: {
    201: {
      description: 'Rol başarıyla oluşturuldu.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: roleResponseSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/roles/{slug}/permissions',
  tags: ['Rol ve İzin Yönetimi (OCP Engine)'],
  summary: 'Rol İzinlerini Güncelle',
  description: 'Var olan bir rolün erişim yetkilerini dinamik olarak günceller. (Yetki: user:manage_roles)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'slug',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Rol kodu (slug: örn. hr, developer)',
    },
  ],
  request: {
    body: {
      description: 'Yeni yetkiler listesi',
      required: true,
      content: { 'application/json': { schema: updateRolePermissionsSchema } },
    },
  },
  responses: {
    200: {
      description: 'Rol izinleri güncellendi.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: roleResponseSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/roles/{slug}/set-default',
  tags: ['Rol ve İzin Yönetimi (OCP Engine)'],
  summary: 'Varsayılan Kullanıcı Rolünü Belirle',
  description: 'Yeni kaydolan veya eklenen personeller için varsayılan rolü belirler. Yalnızca user arketipindeki roller seçilebilir. (Yetki: admin:role:set_default)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'slug',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Varsayılan yapılacak rol kodu (slug)',
    },
  ],
  responses: {
    200: {
      description: 'Varsayılan rol başarıyla güncellendi.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: roleResponseSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/auth/users/{id}/permissions/override',
  tags: ['Kullanıcı & Kimlik Yönetimi'],
  summary: 'Kullanıcıya Özel Yetki İstisnası Belirle (Allow / Deny Override)',
  description: 'Belirli bir personelin rolünden bağımsız olarak yetki verilmesini (allow) veya rolündeki bir yetkisinin geri alınmasını (deny) sağlar. (Yetki: admin:user:override)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Hedef kullanıcı ID (ObjectId)',
    },
  ],
  request: {
    body: {
      description: 'İstisnai yetki listesi (allow ve deny)',
      required: true,
      content: { 'application/json': { schema: overridePermissionsSchema.omit({ targetUserId: true }) } },
    },
  },
  responses: {
    200: {
      description: 'Kullanıcı yetki istisnaları başarıyla uygulandı.',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: userResponseSchema,
          }),
        },
      },
    },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Chotonack AI Gateway & Knowledge Base API',
      version: '1.0.0',
      description:
        'Kurumsal LLM Orkestrasyonu, Yerel Modeller (Ollama), Bulut Modeller ve On-Premises Role-Based Access Control (RBAC) API Dokümantasyonu',
      contact: {
        name: 'Chotonack AI Platform Team',
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
