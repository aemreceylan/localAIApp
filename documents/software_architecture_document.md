# YAZILIM MİMARİSİ VE TEKNİK TASARIM DOKÜMANI (SAD)

**Proje Adı:** Kurumsal LLM & Veri Yönetim Platformu (_Enterprise AI Platform_)

**İlişkili Doküman:** PRD v2.1.0

**Sürüm:** v1.2.0

**Hazırlayan:** Chief System Architect & Security Lead

**Tarih:** Eylül 2026

## 1. DOKÜMAN KÜNYESİ VE MİMARİ VİZYON

### 1.1. Amaç

Bu doküman, PRD v2.1.0'da tanımlanan "Kurumsal LLM & Veri Yönetim Platformu"nun teknik altyapısını, veritabanı tasarımlarını, güvenlik katmanlarını, modüler yazılım mimarisini ve servis entegrasyonlarını tanımlar.

### 1.2. Temel Mimari Prensip ve Felsefeler

- **Modüler Monolit (Modular Monolith) & Bounded Contexts:** Sistem iş alanlarına (Bounded Contexts) göre bağımsız modüllere ayrılmıştır. Her modül kendi iş mantığından, veri modellerinden ve controller'larından sorumludur.

- **Katı Veri İzolasyonu (Data Isolation):** Modüller başka bir modülün veritabanı tablosuna/koleksiyonuna doğrudan erişemez. Veri erişimi yalnızca modüllerin dışa açtığı kamuya açık arayüzler (Public Facades) üzerinden sağlanır.

- **Repository Pattern:** Veri erişim mantığı modüller içinde soyutlanmıştır. İş mantığı (Service katmanı), veritabanı sürücüleri veya ODM/ORM kütüphaneleriyle doğrudan konuşmak yerine modülün kendi repository katmanı (`.repository.ts`) üzerinden etkileşime geçer.

- **Separation of Concerns (SoC):** Veri işleme, LLM orkestrasyonu, kimlik doğrulama, RAG ve model yönetimi bağımsız modüller altında izole edilmiştir.

- **Dayanıklılık ve Güvenlik (Resilience & Security by Design):** Hata toleransı (Circuit Breaker, Retry), DDoS koruması ve mantıksal veri izolasyonu (Multi-Tenancy) mimarinin merkezindedir.

- **Test Edilebilirlik:** Modüller bağımsız unit ve entegrasyon testleri ile doğrulanabilir yapıdadır.

## 2. TEKNOLOJİ YIĞINI (TECH STACK)

| Katman / Bileşen         | Teknoloji / Kütüphane                 | Kullanım Amacı                                                                                               |
| ------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Backend Runtime**      | Node.js (v20+ LTS) & TypeScript (ESM) | Yüksek I/O performansı, Native ES Modules (`"type": "module"`), tip güvenliği ve geniş kütüphane ekosistemi. |
| **HTTP Framework**       | Express.js                            | API yönlendirmesi, middleware yönetimi ve esnek entegrasyon.                                                 |
| **Frontend Framework**   | React & TypeScript                    | Bileşen tabanlı UI, tip güvenliği ve reaktif kullanıcı deneyimi.                                             |
| **Doküman DB / ODM**     | MongoDB & Mongoose ODM                | Esnek doküman/şema yönetimi, kullanıcı/chat geçmişi ve RBAC saklama.                                         |
| **Vektör Veritabanı**    | Qdrant                                | Yüksek performanslı vektör araması, payload bazlı multi-tenancy filtreleme.                                  |
| **LLM Orkestrasyonu**    | Vercel AI SDK                         | LLM soyutlama, embedding üretimi ve SSE tabanlı akış (streaming) yönetimi.                                   |
| **Arka Plan İş Kuyruğu** | BullMQ & Redis                        | Doküman işleme (RAG Ingestion) ve ağır asenkron görevlerin yönetimi.                                         |
| **Test Framework**       | Vitest & Supertest                    | Hızlı unit, integration ve API testleri execution ortamı.                                                    |
| **Konteynerizasyon**     | Docker & Docker Compose               | Multi-container self-hosted / on-premise kurulum ve canlı ortam simülasyonu.                                 |

## 3. MODÜLER MONOLİT (MODULAR MONOLITH) MİMARİSİ

Sistem, iş alanlarına göre modüllere ayrılmıştır. Ortak altyapı bileşenleri `shared/` katmanında toplanmıştır.

### 3.1. Dizin Haritası

```
src/
├── config/             # Genel Sistem & Uygulama Yapılandırmaları
├── modules/
│   ├── auth/           # Kimlik doğrulama, kullanıcılar ve rol yönetimi
│   ├── tenant/         # Tenant ve organizasyon yönetimi
│   ├── chat/           # LLM Sohbet oturumları ve streaming
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

## 4. ÇOKLU KİRACILIK (MULTI-TENANCY) VE VERİ İZOLASYON STRATEJİSİ

MVP aşamasında verim ve bakım kolaylığı sağlamak adına **Row-Level Security (RLS) Mantıksal Ayrım** yaklaşımı BENİMSENMİŞTİR. Multi-tenancy altyapısı `shared/database` katmanında merkezi olarak yönetilir.

### 4.1. MongoDB (Mongoose) Katmanında İzolasyon

1. **Global Tenant Plugin (`shared/database/plugins/tenant.plugin.ts`):** Tüm Mongoose şemalarına `tenant_id` (ObjectId) ve `is_global` (Boolean) alanları zorunlu olarak eklenir.

2. **Automatic Query Hooks:** Mongoose middleware katmanında `pre('find')`, `pre('findOne')`, `pre('count')` ve `pre('aggregate')` kancaları tanımlanır.

3. **İzolasyon Mantığı:**
   - İsteği atan kullanıcının `tenant_id` bilgisi Express `async_hooks` veya Context Middleware üzerinden otomatik okunur.

   - Sorgular varsayılan olarak şu filtreye zorlanır:

     $$
     \text{Filter} = \{ \$or: [ \{ tenant\_id: \text{currentTenantId} \}, \{ is\_global: true \} ] \}
     $$

   - Bu sayede yazılımcı `.find()` çağrısında `tenant_id` yazmayı unutsa dahi başka bir kiracının verisine erişemez.

### 4.2. Qdrant Vektör Katmanında İzolasyon (`src/modules/rag`)

- Qdrant koleksiyonlarında her vektör kaydı payload alanında `tenant_id` taşır.

- Similarity Search (Yakınlık Araması) atılırken Qdrant `Filter` nesnesi zorunlu olarak enjekte edilir:

```
// Qdrant Filter Entegrasyonu (Örnek Mantık)
const filter = {
  must: [
    { key: "tenant_id", match: { value: currentTenantId } }
  ]
};

```

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

- Dış LLM sağlayıcılarının (OpenAI, Anthropic) veya yerel embedding modellerinin dakikalık istek limitlerine (RPM/TPM) takılmamak için BullMQ kuyruk seviyesinde `limiter` konfigürasyonu uygulanır:

  ```
  // Örnek: Dakikada maksimum 50 embedding çıkarma işi çalıştır
  const queue = new Queue('rag-ingestion', {
    limiter: {
      max: 50,
      duration: 60000
    }
  });

  ```

#### 5.2.3. Redis Bellek Yönetimi ve Temizlik (Job Pruning)

- Tamamlanan ve başarısız olan işlerin metadatalarının Redis belleğini doldurarak sunucuyu Out-Of-Memory (OOM) durumuna düşürmemesi için otomatik silme politikası eklenir:

  ```
  const defaultJobOptions = {
    removeOnComplete: { age: 3600, count: 100 }, // 1 saat sonra veya son 100 tamamlanan işi tut
    removeOnFail: { age: 86400, count: 500 }     // Hatalı işleri analiz için 24 saat sakla
  };

  ```

#### 5.2.4. Dosya Boyutuna Göre Önceliklendirme (Priority Queueing)

- Küçük boyutlu dokümanların (1-2 sayfalık PDF/sözleşmeler) büyük dokümanların (500 sayfalık teknik kılavuzlar) arkasında uzun süre beklemesini önlemek adına dinamik önceliklendirme algoritması uygulanır:

  $$
  \text{Priority Score} = \max(1, 1000 - \text{DosyaBoyutuKB})
  $$

- Düşük sayısal değer daha yüksek öncelik anlamına geldiğinden; küçük dosyalar kuyrukta anında öne geçer ve kullanıcılara hızlı geri bildirim sağlanır.

## 6. LLM ORKESTRASYONU VE YANIT AKIŞI (`src/modules/chat`)

### 6.1. Vercel AI SDK & Express SSE Entegrasyonu

- Express sunucusu LLM yanıtlarını tek yönlü ve gerçek zamanlı akıtmak için **Server-Sent Events (SSE)** protokolünü kullanır.

- Vercel AI SDK'nın `streamText` ve Express yanıt nesnesi (`res`) `pipeDataStreamToResponse` yardımcı metodu ile birbirine bağlanır.

### 6.2. Yan Yana Model Karşılaştırma (Side-by-Side Comparison)

- Kullanıcı aynı istemi (prompt) iki farklı modele gönderdiğinde, backend paralel olarak iki LLM akışı başlatır.

- SSE kanalı üzerinden istemciye parçalı JSON yapısı akıtılır:

  $$
  \text{Payload} = \{ modelId: "llama3", chunk: "Hello" \} \quad \text{veya} \quad \{ modelId: "gpt-4o", chunk: "Hi" \}
  $$

- Frontend tarafındaki React bileşeni `modelId` bilgisine göre ilgili mesaj kutusunu anlık olarak günceller.

## 7. DAYANIKLILIK (RESILIENCE) VE SİBER GÜVENLİK MİMARİSİ

### 7.1. Hata Yönetimi (`shared/errors`)

- Uygulama genelinde özel hata sınıfları hiyerarşisi kullanılır:
  - `AppError` (Ana Hata Sınıfı)

  - `DomainError` (İş kuralı ihlalleri)

  - `UnauthorizedTenantError` (Yetkisiz kiracı erişimi denemesi)

  - `LLMProviderError` (Dış servis hataları)

- Express `GlobalErrorHandler` middleware'i tüm yakalanmayan hataları formatlar. Üretim ortamında (Production) asla hassas stack trace veya DB iç yapısı dışarıya sızdırılmaz.

### 7.2. Yeniden Deneme (Retry) & Circuit Breaker

- Dış LLM sağlayıcılarına (OpenAI, Anthropic vb.) veya yerel Ollama servisine yapılan isteklerde **Exponential Backoff** (Üstel Bekleme) yeniden deneme stratejisi uygulanır.

- Bir LLM sağlayıcısı ardışık hatalar verdiğinde **Circuit Breaker** (Devre Kesici) devreye girer. Sistem istemciye anında "Servis geçici olarak kullanılamıyor" yanıtı dönerek sunucu kaynaklarını korur.

### 7.3. Ağ Güvenliği & DDoS Koruması (`shared/middleware`)

1. **Rate Limiting (İstek Sınırlama):**
   - `rate-limiter-flexible` ve Redis entegrasyonu ile IP bazlı ve Kullanıcı/Tenant bazlı API kotası uygulanır.

   - _Örn:_ IP başına dakikada maksimum 100 istek, kullanıcı başına dakikada maksimum 20 chat isteği.

2. **Payload Size Sınırlaması:**
   - JSON gövde boyutu `express.json({ limit: '2mb' })` ile sınırlandırılır.

   - Dosya yüklemelerinde Multer seviyesinde maksimum dosya boyutu (ör. 20MB) ve MIME-Type kontrolü yapılır.

3. **Security Headers & CORS:**
   - `helmet` middleware'i ile HTTP güvenlik başlıkları (X-Frame-Options, CSP, HSTS) zorunlu kılınır.

   - CORS politikası strictly-configured domain listesi ile sınırlandırılır.

## 8. YEREL MODEL YÖNETİMİ (`src/modules/ollama`)

Admin panelinden sunucuya yerel model indirilirken (`ollama pull`):

1. **Disk Kontrolü:** İndirme başlatılmadan önce sistem disk alanı kontrol edilir. Disk doluluğu %85'in üzerindeyse indirme engellenir.

2. **Progress Monitoring:** Express, Ollama API'sinin stream çıktısını dinler. İndirilen byte ve toplam boyut oranlanarak BullMQ/Redis üzerinden Admin UI'a anlık progress bar olarak aktarılır.

3. **Cancel Token:** İptal edilen indirmelerde yetim dosya oluşumu engellenir.

## 9. ORTAM VE DAĞITIM PLANLAMASI (DOCKER)

Self-Hosted MVP kurulumu için tüm sistem bileşenleri `docker-compose.yml` altında izole edilmiştir.

### 9.1. Docker Compose Mimarisi

```
version: '3.8'

services:
  # Express Backend API Container
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: enterprise_ai_api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/enterprise_ai
      - QDRANT_URL=http://qdrant:6333
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - qdrant
      - redis

  # React Frontend Container (Nginx Serves Built Assets)
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: enterprise_ai_web
    ports:
      - "80:80"
    depends_on:
      - api

  # MongoDB Document Database
  mongo:
    image: mongo:7.0
    container_name: enterprise_ai_mongo
    volumes:
      - mongodata:/data/db

  # Qdrant Dedicated Vector Database
  qdrant:
    image: qdrant/qdrant:latest
    container_name: enterprise_ai_qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrantdata:/qdrant/storage

  # Redis for BullMQ & Rate Limiting
  redis:
    image: redis:7-alpine
    container_name: enterprise_ai_redis
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  mongodata:
  qdrantdata:
  redisdata:

```

## 10. TEST STRATEJİSİ VE TEST MİMARİSİ

Proje **Test-Driven Development (TDD)** felsefesine uygun olarak, Modüler Monolit yapısıyla tam uyumlu **Hibrit Test Mimarisi** esas alınarak geliştirilecektir:

### 10.1. Modül İçi Testler (Co-located Module Tests)
- **Konum:** `src/modules/<module-name>/` klasörü içinde.
- **Birim Testleri (`<module>.service.spec.ts`):** Servis katmanındaki iş mantığı, Zod DTO doğrulamaları ve saf fonksiyonların Vitest ile izole test edilmesi.
- **Modül Entegrasyon Testleri (`<module>.controller.spec.ts`):** Modülün HTTP controller ve rota akışlarının sahte (mock) bağımlılıklarla veya bellek içi DB ile doğrulanması.

### 10.2. Sistem Seviyesi ve Güvenlik Testleri (Centralized `tests/`)
- **Konum:** `apps/backend/tests/` klasörü içinde.
- **Uçtan Uca (E2E) API Testleri (`tests/e2e/`):** Supertest kullanılarak Express uygulamasının tüm modüllerinin (Auth -> Tenant -> Chat -> RAG) birlikte uyumlu çalıştığını doğrulayan HTTP senaryo testleri.
- **Tenant İzolasyonu ve RLS Testleri (`tests/e2e/` veya `tests/rls/`):** Farklı `tenant_id` değerlerine sahip kullanıcı kimlikleriyle atılan isteklerin veri sızıntısına yol açmadığını doğrulamak için yazılan özel güvenlik otomasyon testleri.
- **Global Test Setup (`tests/setup.ts`):** Vitest çalıştığında bellek içi MongoDB (mongodb-memory-server) ve test ortam değişkenlerini başlatıp temizleyen merkezi yapılandırma.

---

## 11. SONUÇ VE SONRAKİ ADIMLAR

Bu Software Architecture Document (SAD v1.2), **Kurumsal LLM & Veri Yönetim Platformu** için Modüler Monolit mimarisi temelinde güvenli, modüler, test edilebilir ve sürdürülebilir bir yapı sunmaktadır.

**Geliştirici Ekipleri İçin Başlangıç Adımları:**

1. Proje dizin yapısının Modüler Monolit standartlarına (`src/modules/` ve `src/shared/`) göre oluşturulması.

2. `docker-compose up -d` ile altyapı servislerinin (MongoDB, Qdrant, Redis) ayağa kaldırılması.

3. `shared/database` altındaki Mongoose Global Tenant Plugin'in ve ilk modül olan `auth` modülünün kodlanmaya başlanması.
