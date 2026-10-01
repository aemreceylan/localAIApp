# BACKEND_RULES.md — AI Agent Backend & Güvenlik Kuralları

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (AI Agents)  
> **KAPSAM:** Alt Proje `apps/backend`  
> **AMAÇ:** Backend kodu yazarken uyulması zorunlu olan Modüler Monolit (Modular Monolith) mimari kuralları, modüller arası sınır ve iletişim kuralları, Multi-Tenancy izolasyonu ve güvenlik kalıpları.

---

## 1. Teknoloji Yığını (Referans)

| Katman / Bileşen | Teknoloji                             | Amacı                                                                                      |
| :--------------- | :------------------------------------ | :----------------------------------------------------------------------------------------- |
| Runtime          | Node.js (v20+ LTS) + TypeScript (ESM) | Native ES Modules ("type": "module"), NodeNext module resolution, tip güvenli asenkron I/O |
| HTTP             | Express.js                            | API routes, middleware                                                                     |
| Doküman DB       | MongoDB + Mongoose ODM                | Kullanıcı, chat, rol, audit verileri                                                       |
| Vektör DB        | Qdrant                                | RAG embedding araması                                                                      |
| LLM Orkestrasyon | Vercel AI SDK                         | Model soyutlama, streaming                                                                 |
| İş Kuyruğu       | BullMQ + Redis                        | Ağır async işler (RAG ingestion)                                                           |
| Test             | Vitest + Supertest                    | Unit, integration, API testleri                                                            |

---

## 2. Modüler Monolit (Modular Monolith) Mimari Kuralları

Klasik katmanlı Clean Architecture yerine, sistem **iş alanlarına (Bounded Contexts)** göre bağımsız modüllere ayrılmıştır. Her modül kendi iş mantığından, veri modellerinden ve HTTP controller'larından sorumludur.

### ES Module (ESM) ve Modül İçe/Dışa Aktarım Standartları

1. **Native ESM Zorunluluğu:** `apps/backend/package.json` içerisinde `"type": "module"` tanımlıdır. Tüm `import` / `export` ifadeleri standart ES Module syntax'ı ile yazılmalıdır (`require`/`module.exports` kullanımı kesinlikle yasaktır).
2. **Barrel Export (Public Facade):** Modüller dışa açacakları tüm servis, dto ve event tiplerini kendi `index.ts` dosyalarından `export` eder. Modül dışındaki kodlar doğrudan iç dosyalara (`.model.ts`, `.repository.ts` vb.) erişemez.
3. **Explicit Extension / Module Resolution:** TypeScript konfigürasyonunda `moduleResolution: "NodeNext"` kullanılarak modern Node.js modül çözünürlük standartlarına tam uyum sağlanır.
4. **Standart Node.js Subpath Imports (`#*`) Zorunluluğu:**
   - Kod tabanında derin veya kırılgan göreceli yollar (`../../`, `../../../`) yerine daima Node.js ve ECMAScript standart subpath import tanımlayıcıları kullanılır:
     - `#config/*` → `./src/config/*`
     - `#modules/*` → `./src/modules/*`
     - `#shared/*` → `./src/shared/*`
     - `#*` → `./src/*`
   - **Gerekçe:** Dosya veya klasör düzeni güncellendiğinde tüm dosyaların import yollarının tek tek güncellenmesi zorunluluğunu ortadan kaldırır; refactor süreçlerini güvenli ve hızlı kılar.
   - **Build & Runtime:** `package.json` altındaki `"imports"` nesnesi ve `tsconfig.json` altındaki `"paths"` eşlemesi sayesinde hem geliştirme (`tsx`/`vitest`), hem IDE, hem de üretimde (native Node ESM) sıfır ek yük ile yerel çözümleme sağlanır. Üretim derlemesinde doğrudan `tsc -p tsconfig.build.json` çalıştırılır.
5. **Katı Ortam Değişkeni Yönetimi (Strict Zero-Default & Fail-Fast Validation):**
   - Kod tabanında (özellikle `src/config/env.config.ts`) hiçbir ortam değişkenine varsayılan değer (`.default(...)`) verilemez; tüm parametreler (`NODE_ENV`, `HOST`, `PORT`, `CORS_ORIGIN`, `OLLAMA_BASE_URL`, `MONGODB_URI`) doğrudan `.env` veya sistem ortamından Zod ile doğrulanmalıdır.
   - Uygulama başlatılırken herhangi bir eksiklik veya tip uyuşmazlığı tespit edilirse, fail-fast prensibiyle detaylı hata listesini içeren bir istisna fırlatılarak (`throw new Error(...)`) süreç kontrollü olarak sonlandırılır; konfigürasyon modülü içinde doğrudan `process.exit()` çağrısı yapılmaz.
   - Kural 5 gereği ortam değişkenlerinde `DEFAULT_MODEL` gibi hardcoded model tanımlamaları yer alamaz.

### Klasör Yapısı (`apps/backend/src/`)

```
src/
├── config/             # Genel Sistem & Uygulama Yapılandırmaları
├── modules/
│   ├── auth/           # Kimlik doğrulama, kullanıcılar ve rol yönetimi
│   ├── tenant/         # Tenant ve organizasyon yönetimi
│   ├── chat/           # LLM Sohbet oturumları ve streaming
│   ├── prompt/         # Çok katmanlı dinamik prompt & persona yönetim motoru
│   ├── rag/            # Doküman ingestion, embedding ve Qdrant vektör araması
│   └── ai/             # Yerel model indirme ve yönetim modülü
├── shared/             # Ortak altyapı, middleware'ler, RLS, base class'lar
│   ├── database/       # Mongoose bağlantısı, tenant plugin'leri
│   ├── errors/         # Standart hata hiyerarşisi
│   ├── middleware/     # Auth, RLS, Rate limit, validation middleware'leri
│   ├── queue/          # BullMQ/Redis temel yapılandırmaları
│   └── utils/          # Ortak yardımcı fonksiyonlar
├── tests/              # Test süiti ve ortam yapılandırmaları
├── app.ts              # Express app konfigürasyonu ve modül route'larının kaydı
└── server.ts           # Sunucu başlatma ve graceful shutdown
```

### Modül İçi Yapı Standartları

Her modül (`src/modules/<module-name>/`) kendi içinde belirgin bir sorumluluk ayrımına sahip olmalıdır:

```
src/modules/<module-name>/
├── <module-name>.controller.ts   # Express request/response işleme
├── <module-name>.service.ts      # Modülün iş mantığı (Business Logic)
├── <module-name>.repository.ts   # Veri tabanı erişim katmanı (Mongoose/Qdrant)
├── <module-name>.model.ts        # Mongoose şema ve model tanımları
├── <module-name>.dto.ts          # Zod doğrulama şemaları ve TS tipleri
├── <module-name>.events.ts       # (Opsiyonel) Modül içi/arası event tanımları
└── index.ts                      # Modülün DIŞA AÇIK public API'si (Public Facade)
```

### Modüller Arası İletişim ve İzolasyon Kuralları

1. **Katı Veri İzolasyonu (No Cross-Database Queries):**
   - Bir modül, başka bir modülün Mongoose modelini (`.model.ts`) veya repository'sini **asla doğrudan import edip sorgulayamaz**.
   - _Örnek:_ `chat` modülü, doğrudan `UserModel.find()` çağıramaz. Kullanıcı bilgisine ihtiyaç varsa `auth` modülünün public servis/facade arayüzü (`authService.getUserById()`) kullanılmalıdır.
2. **Kamuya Açık Arayüz (Public API / Barrel Export):**
   - Modüller arası tüm erişim yalnızca ilgili modülün `index.ts` dosyası üzerinden dışa aktarılan (exported) servis veya interface'ler vasıtasıyla yapılır.
   - Modülün içindeki private dosyalar (`.model.ts`, `.repository.ts`, iç helper'lar) başka modüller tarafından doğrudan `import` edilemez.
3. **Gevşek Bağlılık (Event-Driven Communication):**
   - Modüller arası asenkron etkileşimlerde Node.js `EventEmitter` veya `shared/events` kullanılır.
4. **Döngüsel Bağımlılık Yasağı (No Circular Dependencies):**
   - Modüller arasında bağımlılık döngüsü (`Auth -> Tenant -> Auth`) kesinlikle yasaktır.

---

## 3. Multi-Tenancy: Row-Level Security (RLS)

Multi-Tenancy altyapısı `shared/database` altında merkezi olarak yönetilir ve tüm modüllerde standart olarak uygulanır.

### MongoDB (Mongoose) İzolasyonu

1. **Global Tenant Plugin (`shared/database/plugins/tenant.plugin.ts`):** Tüm Mongoose şemalarına `tenant_id: ObjectId` ve `is_global: Boolean` alanları otomatik eklenir.
2. **Query Hook'ları:** `pre('find')`, `pre('findOne')`, `pre('count')`, `pre('aggregate')` middleware'lerinde tenant filtresi enjekte edilir.
3. **Filtre Mantığı:**
   ```typescript
   {
     $or: [{ tenant_id: currentTenantId }, { is_global: true }];
   }
   ```
4. **Bypass Yok:** Geliştiricinin `.find()` çağrısında `tenant_id` yazmayı unutması tehlikesiz olacak şekilde hook katmanı her zaman filtreyi zorlar.

### Qdrant Vektör İzolasyonu (`src/modules/rag`)

- Her vektör kaydı payload'ında `tenant_id` taşır.
- Similarity search sırasında Qdrant `Filter` nesnesi zorunlu olarak eklenir:
  ```typescript
  const filter = {
    must: [{ key: "tenant_id", match: { value: currentTenantId } }],
  };
  ```
- **Filtresiz arama yapan fonksiyon yazılırsa bu güvenlik ihlali sayılır.**

---

## 4. Hata Yönetimi & Dayanıklılık Mimarisi

Sistemde iki kademeli bir hata yaşam döngüsü (Two-Tier Error Lifecycle) uygulanır:

### 4.1. İki Kademeli Hata Yaşam Döngüsü (Two-Tier Error Lifecycle)

| Yaşam Evresi | Kapsam & Tetikleyici | Hata Ele Alma Yolu | Çıktı & Davranış |
| :--- | :--- | :--- | :--- |
| **1. Boot-Time (Başlatma & Ön Denetim)** | `.env` doğrulaması (`env.config.ts`), MongoDB bağlantısı (`connectDatabase`) | Konfigürasyon modülü detaylı `Error` fırlatır (`throw new Error(...)`). `server.ts` içerisindeki `bootstrap().catch()` bloğu hatayı yakalar. | Terminal/loglara `❌ [alan]: hata` dökümü basılır ve süreç `process.exit(1)` ile durdurulur. HTTP yanıtı verilmez, modül içinde doğrudan `process.exit` çağrısı yapılmaz. |
| **2. Run-Time (HTTP İstek & İş Mantığı)** | Controller, Service, Zod DTO doğrulama, LLM servis çağrıları | İş kurallarına göre `AppError` türevi sınıflar fırlatılır. `globalErrorHandler` (`shared/middleware/error.middleware.ts`) yakalar. | İstemciye standart HTTP statü kodu ve JSON Hata Zarfı (Envelope) döner. Üretim ortamında `stack` trace gizlenir. |

### 4.2. Hata Sınıfları Hiyerarşisi (`shared/errors/`)

```
AppError (Soyut Ana Hata - statusCode, code, isOperational, details)
├── DomainError              → İş kuralı ihlalleri (HTTP 400 - DOMAIN_ERROR)
├── UnauthorizedTenantError  → Çok kiracılı izolasyon ihlali (HTTP 403 - UNAUTHORIZED_TENANT)
├── NotFoundError            → İstenen kaynak bulunamadı (HTTP 404 - NOT_FOUND)
├── ValidationError          → Zod / DTO şema doğrulama hataları (HTTP 422 - VALIDATION_ERROR)
└── LLMProviderError         → Dış LLM / Ollama iletişim ve servis hataları (HTTP 502 - LLM_PROVIDER_ERROR)
```

### 4.3. Standart HTTP Hata Yanıt Zarfı (Envelope Contract)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Geçersiz istek verileri.",
    "details": [
      {
        "field": "body.model",
        "message": "Model seçimi zorunludur."
      }
    ]
  }
}
```

---

## 5. Güvenlik Kuralları

- **Rate Limiting (`shared/middleware/rate-limiter.ts`):** IP bazlı dakikada maks. 100 istek; kullanıcı bazlı dakikada maks. 20 chat isteği (`rate-limiter-flexible` & Redis).
- **Payload Sınırları:** JSON body `express.json({ limit: '2mb' })`; Multer ile maks. 20MB.
- **Security Headers:** `helmet` zorunlu, katı CORS.
- **LLM Dayanıklılık:** Exponential Backoff (3 deneme) ve Circuit Breaker (5 hatada 30 sn kesinti).

---

## 6. BullMQ İş Kuyruğu Kuralları (`src/modules/rag`)

1. Kullanıcı doküman yükler → Express API (`rag.controller`) dosyayı kaydeder ve DB'de `PENDING` kaydı açar.
2. BullMQ'ya iş eklenir → Worker (`rag.worker.ts`) metin çıkarır, parçalar, Vercel AI SDK ile embed eder, Qdrant'a `tenant_id` payload'ı ile kaydeder.
3. İş tamamlanınca DB durumu `COMPLETED` olur ve UI'a SSE ile bildirilir.
- Concurrency: 2 veya 3.
- Limiter: Dakikada maks. 50 iş.
- Otomatik temizlik: `removeOnComplete`, `removeOnFail`.

---

## 7. Yerel Model İndirme (`src/modules/ai`)

1. **Disk Kontrolü:** Doluluk %85 üzerindeyse engellenir.
2. **Progress Stream:** Ollama stream çıktısı dinlenir, BullMQ/Redis üzerinden aktarılır.
3. **Cancel Token:** Abort controller ile yetim dosya engellenir.

---

## 8. Admin Model Yönetimi & Dinamik Model Kataloğu

1. **Hardcoded Model Yasağı:** Kodda veya şemalarda sabit model adı (`llama3.2:3b`, `gpt-4o`) yer alamaz.
2. **Admin Yetkisi:** İzinli modeller (`allowed_models`) ve önerilen model (`default_model`) yalnızca admin tarafından belirlenir.
3. **Zorunlu Seçim:** Model parametresi eksik olan istekler `422 ValidationError` alır.

---

## 9. Çok Katmanlı Dinamik Sistem Prompt Mimarisi (Prompt Stacking)

1. **Bağımsız Prompt Modülü (`src/modules/prompt`):** Bağımsız Mongoose koleksiyonunda (`PromptModel`) saklanır.
2. **Anlık Birleştirme (Realtime Assembly):**
   - 1. Katman: Kurumsal Güvenlik & Guardrails (`system_guardrail`)
   - 2. Katman: Rol & Persona (`persona`)
   - 3. Katman: Kullanıcı Özel Talimatı (`custom_instructions`)
3. **Anlık Etki:** Yönetici güncellediğinde sonraki ilk mesajda yeni kurallar devreye girer.

---

## 10. Canlı API Dokümantasyonu & OpenAPI 3.0 Standardı

1. **Zod ile Şema Tanımı:** İstek/yanıt şemaları `.dto.ts` içinde `@asteasolutions/zod-to-openapi` ile yazılır.
2. **Merkezi Kayıt:** `src/config/openapi.config.ts` dosyasına kaydedilir.
3. **Çift Yönlü Erişim:** Web UI (`/api/docs`) ve master dosya (`documents/openapi.json`).

---

## 11. AI Model Sağlayıcı Mimarisi, Factory Deseni & Dinamik Registry (`src/modules/ai/`)

1. **`IAiModelProvider` Standart Arayüzü:** Tüm model motorlarının uygulaması gereken ortak arayüz: `supports(modelId)` ve `getModel(modelName, options)`.
2. **Genişletilebilir Fabrika Deseni (`AiProviderFactory`):**
   - Yeni model sağlayıcıları (`ollama`, `openai`, `anthropic`, `vllm` vb.) `aiProviderFactory.createProvider(type, config)` ile üretilir.
   - OCP gereği yeni bir motor tipi sisteme eklenirken mevcut sınıfları değiştirmeden `registerCreator(type, creatorFn)` ile genişletilebilir.
3. **Merkezi Sicil (`AiProviderRegistry`):**
   - Açık/Kapalı (OCP) prensibiyle sağlayıcıları kaydeder.
   - **Hardcoded Default Yasağı:** Kodda hiçbir sağlayıcı veya model sabit `default` olarak işaretlenemez.
   - **Admin Dinamik Varsayılanı:** Yalnızca Admin veya tenant yapılandırması tarafından `setDefaultProvider(providerId)` çağrısı ile çalışma zamanında varsayılan atanabilir.
4. **Model Çözümleme (`resolveModel`):**
   - Öncelik 1: Açık sağlayıcı belirteci (`provider/model` veya `{ provider, model }`).
   - Öncelik 2: Modeli doğrudan desteklediğini beyan eden sağlayıcı (`supports`).
   - Öncelik 3: Admin tarafından tanımlanmış aktif varsayılan sağlayıcı (`defaultProviderId`).
   - Çözümlenemeyen veya tanımlı olmayan modellerde `422 ValidationError`.
5. **Zengin Kod İçi Yorum Standardı:**
   - Factory, Registry ve Adapter gibi soyutlama ve tasarım deseni içeren tüm modül dosyalarında; deseni açıklayan, somut `@example` kod blokları, `@param`, `@returns` ve `@throws` etiketleri içeren detaylı JSDoc zorunludur.

