# BACKEND YAZILIM MİMARİSİ VE TEKNİK TASARIM DOKÜMANI

> **DOKÜMAN TİPİ:** Alt Proje Özel Mimari Spesifikasyonu (`apps/backend`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_)  
> **İlişkili Dokümanlar:** [Ortak PRD v2.1.0](../common/prd.md), [Veritabanı ve İş Akış Şemaları](../common/data_and_business_workflows.md), [OpenAPI 3.0 Dokümanı](../openapi.json)  
> **Sürüm:** v1.2.0  
> **Hazırlayan:** Chief System Architect & Security Lead  
> **Tarih:** Eylül 2026  

---

## 1. DOKÜMAN KÜNYESİ VE MİMARİ VİZYON

### 1.1. Amaç

Bu doküman, `apps/backend` uygulamasının teknik altyapısını, veritabanı tasarımlarını, güvenlik katmanlarını, modüler yazılım mimarisini ve servis entegrasyonlarını tanımlar.

### 1.2. Temel Mimari Prensip ve Felsefeler

- **Modüler Monolit (Modular Monolith) & Bounded Contexts:** Sistem iş alanlarına (Bounded Contexts) göre bağımsız modüllere ayrılmıştır. Her modül kendi iş mantığından, veri modellerinden ve controller'larından sorumludur.
- **Katı Veri İzolasyonu (Data Isolation):** Modüller başka bir modülün veritabanı tablosuna/koleksiyonuna doğrudan erişemez. Veri erişimi yalnızca modüllerin dışa açtığı kamuya açık arayüzler (Public Facades) üzerinden sağlanır.
- **Repository Pattern:** Veri erişim mantığı modüller içinde soyutlanmıştır. İş mantığı (Service katmanı), veritabanı sürücüleri veya ODM/ORM kütüphaneleriyle doğrudan konuşmak yerine modülün kendi repository katmanı (`.repository.ts`) üzerinden etkileşime geçer.
- **Separation of Concerns (SoC):** Veri işleme, LLM orkestrasyonu, kimlik doğrulama, RAG ve model yönetimi bağımsız modüller altında izole edilmiştir.
- **Dayanıklılık ve Güvenlik (Resilience & Security by Design):** Hata toleransı (Circuit Breaker, Retry), DDoS koruması ve mantıksal veri izolasyonu (Multi-Tenancy) mimarinin merkezindedir.
- **Test Edilebilirlik:** Modüller bağımsız unit ve entegrasyon testleri ile doğrulanabilir yapıdadır.

---

## 2. TEKNOLOJİ YIĞINI (TECH STACK)

| Katman / Bileşen         | Teknoloji / Kütüphane                 | Kullanım Amacı                                                                                               |
| ------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Backend Runtime**      | Node.js (v20+ LTS) & TypeScript (ESM) | Yüksek I/O performansı, Native ES Modules (`"type": "module"`), tip güvenliği ve geniş kütüphane ekosistemi. |
| **HTTP Framework**       | Express.js                            | API yönlendirmesi, middleware yönetimi ve esnek entegrasyon.                                                 |
| **Doküman DB / ODM**     | MongoDB & Mongoose ODM                | Esnek doküman/şema yönetimi, kullanıcı/chat geçmişi ve RBAC saklama.                                         |
| **Vektör Veritabanı**    | Qdrant                                | Yüksek performanslı vektör araması, payload bazlı multi-tenancy filtreleme.                                  |
| **LLM Orkestrasyonu**    | Vercel AI SDK                         | LLM soyutlama, embedding üretimi ve SSE tabanlı akış (streaming) yönetimi.                                   |
| **Arka Plan İş Kuyruğu** | BullMQ & Redis                        | Doküman işleme (RAG Ingestion) ve ağır asenkron görevlerin yönetimi.                                         |
| **Test Framework**       | Vitest & Supertest                    | Hızlı unit, integration ve API testleri execution ortamı.                                                    |
| **Konteynerizasyon**     | Docker & Docker Compose               | Multi-container self-hosted / on-premise kurulum ve canlı ortam simülasyonu.                                 |

---

## 3. MODÜLER MONOLİT (MODULAR MONOLITH) MİMARİSİ

Sistem, iş alanlarına göre modüllere ayrılmıştır. Ortak altyapı bileşenleri `shared/` katmanında toplanmıştır.

### 3.1. Dizin Haritası (`apps/backend/src/`)

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

### 3.2. Modül İçi Yapı Standartları

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

### 3.3. Modüller Arası İletişim ve İzolasyon Kuralları

1. **Katı Veri İzolasyonu (No Cross-Database Queries):**
   - Bir modül, başka bir modülün Mongoose modelini (`.model.ts`) veya repository'sini **asla doğrudan import edip sorgulayamaz**.
   - _Örnek:_ `chat` modülü doğrudan `UserModel.find()` çağıramaz. Kullanıcı bilgisine ihtiyaç varsa `auth` modülünün public servis/facade arayüzü (`authService.getUserById()`) kullanılmalıdır.
2. **Kamuya Açık Arayüz (Public API / Barrel Export):**
   - Modüller arası tüm erişim yalnızca ilgili modülün `index.ts` dosyası üzerinden dışa aktarılan (exported) servis veya interface'ler vasıtasıyla yapılır.
   - Modülün içindeki private dosyalar (`.model.ts`, `.repository.ts`, iç helper'lar) başka modüller tarafından doğrudan `import` edilemez.
3. **Gevşek Bağlılık (Event-Driven Communication):**
   - Modüller arası asenkron etkileşimlerde (örneğin: Yeni tenant oluştuğunda varsayılan RAG klasörlerinin hazırlanması) Node.js `EventEmitter` veya `shared/events` kullanılır.
4. **Döngüsel Bağımlılık Yasağı (No Circular Dependencies):**
   - Modüller arasında bağımlılık döngüsü (`Auth -> Tenant -> Auth`) kesinlikle yasaktır. Ortak bağımlılıklar `shared/` katmanına veya bağımsız bir kontrata taşınmalıdır.
5. **Standart Node.js Subpath Imports (`#*`) Zorunluluğu (Refactoring-Resistant Imports):**
   - Modül içi ve modüller arası tüm dosya erişimlerinde Node.js ve ECMAScript standart subpath import tanımlayıcıları (`#config/*`, `#modules/*`, `#shared/*`, `#*`) standart olarak kullanılır.
   - Derin ve kırılgan göreceli yollar (`../../`, `../../../`) yasaklanmıştır. Bu kural, dosya veya modül yapısı güncellendiğinde import yollarının topluca bozulmasını önler. `package.json` altındaki `"imports"` nesnesi ve `tsconfig.json` paths haritası sayesinde harici regex dönüştürme betiklerine gerek kalmadan hem geliştirme (`tsx`/`vitest`), hem IDE, hem de üretimde (native Node ESM) sıfır çalışma zamanı ek yükü ile modül çözünürlüğü garanti edilir.

---

## 4. ÇOKLU KİRACILIK (MULTI-TENANCY) VE VERİ İZOLASYON STRATEJİSİ

MVP aşamasında verim ve bakım kolaylığı sağlamak adına **Row-Level Security (RLS) Mantıksal Ayrım** yaklaşımı benimsenmiştir. Multi-tenancy altyapısı `shared/database` katmanında merkezi olarak yönetilir.

### 4.1. MongoDB (Mongoose) Katmanında İzolasyon

1. **Global Tenant Plugin (`shared/database/plugins/tenant.plugin.ts`):** Tüm Mongoose şemalarına `tenant_id` (ObjectId) ve `is_global` (Boolean) alanları zorunlu olarak eklenir.
2. **Automatic Query Hooks:** Mongoose middleware katmanında `pre('find')`, `pre('findOne')`, `pre('count')` ve `pre('aggregate')` kancaları tanımlanır.
3. **İzolasyon Mantığı:**
   - İsteği atan kullanıcının `tenant_id` bilgisi Express Context Middleware üzerinden otomatik okunur.
   - Sorgular varsayılan olarak şu filtreye zorlanır:
     $$\text{Filter} = \{ \$or: [ \{ tenant\_id: \text{currentTenantId} \}, \{ is\_global: true \} ] \}$$
   - Bu sayede yazılımcı `.find()` çağrısında `tenant_id` yazmayı unutsa dahi başka bir kiracının verisine erişemez.

### 4.2. Qdrant Vektör Katmanında İzolasyon (`src/modules/rag`)

- Qdrant koleksiyonlarında her vektör kaydı payload alanında `tenant_id` taşır.
- Similarity Search (Yakınlık Araması) atılırken Qdrant `Filter` nesnesi zorunlu olarak enjekte edilir:
```typescript
const filter = {
  must: [
    { key: "tenant_id", match: { value: currentTenantId } }
  ]
};
```

---

## 5. RAG (RETRIEVAL-AUGMENTED GENERATION) VE ASENKRON İŞ KUYRUĞU (`src/modules/rag`)

Kullanıcıların yüklediği yüksek boyutlu dokümanların işlenmesi ana sunucu thread'ini tıkamamalıdır.

### 5.1. Doküman İşleme Akış Şeması (RAG Ingestion Pipeline)

```
[User UI] ──(1) HTTP Upload (Multer % Progress)──> [RAG Controller]
                                                         │
                                               (2) Save File & Create DB Record (Status: PENDING)
                                                         │
                                                         ▼
                                            [BullMQ Queue (Redis)]
                                                         │
                                                         ▼
                                                [BullMQ Worker]
                                                         │
                        ┌────────────────────────────────┴────────────────────────────────┐
                        │ - Text Extraction (PDF/DOCX)                                     │
                        │ - Chunking Strategy (Recursive Character Splitter)              │
                        │ - Vercel AI SDK (`embedMany`) -> Generate Vector Embeddings     │
                        │ - Save Vectors to Qdrant (with tenant_id payload)               │
                        │ - Update Job Progress (job.updateProgress(%))                   │
                        └────────────────────────────────┬────────────────────────────────┘
                                                         │
                                               (3) Update DB (Status: COMPLETED)
                                                         │
                                                         ▼
                                            [SSE Notification to UI]
```

### 5.2. Kuyruk, Performans ve Kaynak Yönetimi Stratejileri

#### 5.2.1. Eşzamanlı Çalışma Sınırı (Worker Concurrency Control)
- **Kaynak Koruması:** Sunucu CPU ve RAM kapasitesini aşırı yükten korumak adına her bir BullMQ Worker prosesi için eşzamanlı işleme sınırı tanımlanır (`concurrency: 2` veya `concurrency: 3`).
- Kuyrukta yüzlerce doküman birikse dahi sistem aynı anda yalnızca belirlenen sayıdaki dokümanı işler, kalan işler Redis üzerinde güvenle bekletilir.

#### 5.2.2. Hız Sınırlama (BullMQ Built-In Rate Limiting)
- Dış LLM sağlayıcılarının (OpenAI, Anthropic) veya yerel embedding modellerinin dakikalık istek limitlerine (RPM/TPM) takılmamak için BullMQ kuyruk seviyesinde `limiter` konfigürasyonu uygulanır.

#### 5.2.3. Redis Bellek Yönetimi ve Temizlik (Job Pruning)
- Tamamlanan ve başarısız olan işlerin metadatalarının Redis belleğini doldurarak sunucuyu Out-Of-Memory (OOM) durumuna düşürmemesi için otomatik silme politikası eklenir.

#### 5.2.4. Dosya Boyutuna Göre Önceliklendirme (Priority Queueing)
- Küçük boyutlu dokümanların (1-2 sayfalık PDF/sözleşmeler) büyük dokümanların arkasında beklemesini önlemek adına dinamik önceliklendirme uygulanır:
  $$\text{Priority Score} = \max(1, 1000 - \text{DosyaBoyutuKB})$$

---

## 6. LLM ORKESTRASYONU VE YANIT AKIŞI (`src/modules/chat`)

### 6.1. Vercel AI SDK & Express SSE Entegrasyonu
- Express sunucusu LLM yanıtlarını tek yönlü ve gerçek zamanlı akıtmak için **Server-Sent Events (SSE)** protokolünü kullanır.
- Vercel AI SDK'nın `streamText` ve Express yanıt nesnesi (`res`) `pipeDataStreamToResponse` yardımcı metodu ile birbirine bağlanır.

### 6.2. Yan Yana Model Karşılaştırma (Side-by-Side Comparison)
- Kullanıcı aynı istemi (prompt) iki farklı modele gönderdiğinde, backend paralel olarak iki LLM akışı başlatır.
- SSE kanalı üzerinden istemciye parçalı JSON yapısı akıtılır:
  $$\text{Payload} = \{ modelId: "llama3", chunk: "Hello" \} \quad \text{veya} \quad \{ modelId: "gpt-4o", chunk: "Hi" \}$$
- Frontend tarafındaki React bileşeni `modelId` bilgisine göre ilgili mesaj kutusunu anlık olarak günceller.

---

## 7. DAYANIKLILIK (RESILIENCE) VE SİBER GÜVENLİK MİMARİSİ

### 7.1. Hata Yönetimi & İki Kademeli Yaşam Döngüsü (`shared/errors`)

1. **Boot-Time (Başlatma Evresi) Hata Yönetimi:**  
   - Ortam değişkenleri (`env.config.ts`), MongoDB bağlantısı vb. kritik ön koşullarda eksiklik veya tip uyumsuzluğu durumunda modüller zengin içerikli `Error` fırlatır (`throw new Error(...)`).  
   - `server.ts` içerisindeki `bootstrap().catch()` bloğu hatayı konsola detaylı biçimde basarak süreci `process.exit(1)` ile durdurur. Modüller içerisinde doğrudan `process.exit()` çağrısı yapılması yasaktır.
2. **Run-Time (İstek Evresi) Hata Hiyerarşisi:**  
   Uygulama genelinde özel `AppError` hiyerarşisi kullanılır (`AppError`, `DomainError`, `UnauthorizedTenantError`, `NotFoundError`, `ValidationError`, `LLMProviderError`).
3. **Global Error Handler & Standart JSON Zarfı:**  
   Express `GlobalErrorHandler` middleware'i yakalanmayan tüm hataları yakalar ve istemciye standart zarfta döner.

### 7.2. Yeniden Deneme (Retry) & Circuit Breaker
- Dış LLM sağlayıcılarına veya yerel Ollama servisine yapılan isteklerde **Exponential Backoff** yeniden deneme stratejisi uygulanır.
- Bir LLM sağlayıcısı ardışık hatalar verdiğinde **Circuit Breaker** (Devre Kesici) devreye girer.

### 7.3. Ağ Güvenliği & DDoS Koruması (`shared/middleware`)
- Rate Limiting (`rate-limiter-flexible` & Redis).
- Payload Size Sınırlaması (`express.json({ limit: '2mb' })` ve Multer kota kontrolü).
- Security Headers (`helmet`) ve katı CORS politikası.

---

## 8. YEREL MODEL YÖNETİMİ (`src/modules/ai`)

Admin panelinden sunucuya yerel model indirilirken (`ollama pull`):
1. **Disk Kontrolü:** İndirme başlatılmadan önce sistem disk alanı kontrol edilir. Disk doluluğu %85'in üzerindeyse indirme engellenir.
2. **Progress Monitoring:** Express, Ollama API'sinin stream çıktısını dinler. İndirilen byte ve toplam boyut oranlanarak BullMQ/Redis üzerinden Admin UI'a anlık progress bar olarak aktarılır.
3. **Cancel Token:** İptal edilen indirmelerde yetim dosya oluşumu engellenir.

---

## 9. ORTAM VE DAĞITIM PLANLAMASI (DOCKER)

Self-Hosted MVP kurulumu için tüm sistem bileşenleri `docker-compose.yml` altında izole edilmiştir (Express API, MongoDB, Qdrant, Redis).

---

## 10. TEST STRATEJİSİ VE TEST MİMARİSİ

Proje **Test-Driven Development (TDD)** felsefesine uygun olarak, Modüler Monolit yapısıyla tam uyumlu **Hibrit Test Mimarisi** esas alınarak geliştirilir:
- **Modül İçi Testler (`src/modules/<module-name>/`):** Birim testleri (`.service.spec.ts`) ve modül entegrasyon testleri (`.controller.spec.ts`).
- **Sistem Seviyesi ve Güvenlik Testleri (`apps/backend/tests/`):** Uçtan Uca (E2E) API Testleri (`tests/e2e/`), Tenant İzolasyonu ve RLS Testleri, Global Test Setup (`tests/setup.ts`).

---

## 11. ADMİN MODEL YÖNETİMİ VE HARDCODED MODEL YASAĞI (MODEL SELECTION ARCHITECTURE)

Kurumsal platformda hiçbir veritabanı şemasında (Mongoose/MongoDB), TypeScript DTO katmanında veya ortam değişkenlerinde (`.env`) varsayılan bir model adı (örn. `llama3.2:3b`, `gpt-4o`) sabit kodlanamaz (hardcoded default yasaktır).
1. **Zorunlu Seçim (Mandatory Selection):** Sohbet oturumu açılırken model parametresi kullanıcı/istemci tarafından açıkça iletilmek zorundadır. Eksik olması durumunda `422 Unprocessable Entity` fırlatılır.
2. **Admin Yetkisi ve İzinli Modeller (Allowed Models Registry):** Hangi modellerin seçilebileceğini yalnızca sistem yöneticisi dinamik yönetim paneli üzerinden belirler.
3. **Model Validasyonu:** İstemciden gelen model adı yetkilendirilmiş modeller listesiyle doğrulanır.

---

## 12. ÇOK BOYUTLU DİNAMİK PROMPT MOTORU (PROMPT STACKING & REAL-TIME ASSEMBLY)

Sistem promptları tek bir metin alanı olarak `Conversation` koleksiyonuna gömülü statik bir yapıda tutulamaz.
1. **Katman 1 - Kurumsal Güvenlik & İlke Kuralları (`system_guardrail`):** Tenant bazlı, `priority` sırasına göre anlık sorgulanır.
2. **Katman 2 - Uzmanlık Rolü / Persona (`persona`):** Sohbet oturumunun bağlı olduğu veya varsayılan atanan rol direktifi.
3. **Katman 3 - Oturuma Özel Ek Talimatlar (`custom_instructions`):** Kullanıcının ilgili oturuma özel eklediği yönergeler.
- **Gerçek Zamanlı Güncelleme:** Yönetici prompt güncellediği anda yeni deploy gerekmeksizin sonraki ilk mesajda tüm oturumlarda yürürlüğe girer.

---

## 13. CANLI API DOKÜMANTASYONU VE OPENAPI 3.0 SPESİFİKASYONU

Platformun tüm REST API uç noktaları tip güvenli OpenAPI 3.0 standardına göre belgelenir.
- **Zod & OpenAPI Entegrasyonu:** DTO'lar `@asteasolutions/zod-to-openapi` ile tanımlanır.
- **Swagger UI Web Arayüzü (`GET /api/docs`)**
- **Ham OpenAPI JSON Çıktısı (`GET /api/docs.json`)**
- **Statik Master Doküman (`documents/openapi.json`)**
