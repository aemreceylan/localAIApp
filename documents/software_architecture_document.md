# YAZILIM MİMARİSİ VE TEKNİK TASARIM DOKÜMANI (SAD)

**Proje Adı:** Kurumsal LLM & Veri Yönetim Platformu (_Enterprise AI Platform_)  
**İlişkili Doküman:** PRD v2.1.0  
**Sürüm:** v1.1.0  
**Hazırlayan:** Chief System Architect & Security Lead  
**Tarih:** Eylül 2026  

---

## 1. DOKÜMAN KÜNYESİ VE MİMARİ VİZYON

### 1.1. Amaç
Bu doküman, PRD v2.1.0'da tanımlanan "Kurumsal LLM & Veri Yönetim Platformu"nun teknik altyapısını, veritabanı tasarımlarını, güvenlik katmanlarını, modüler yazılım mimarisini ve servis entegrasyonlarını tanımlar.

### 1.2. Temel Mimari Prensip ve Felsefeler
* **Clean Architecture & Modülerlik:** İş kuralları (Domain) dış bağımlılıklardan (Express, MongoDB, Qdrant, Vercel AI SDK vb.) tamamen bağımsızdır.
* **Separation of Concerns (SoC):** Veri işleme, LLM orkestrasyonu, kimlik doğrulama ve API sunum katmanları kesin çizgilerle ayrılmıştır.
* **Repository Pattern:** Veri depolama teknolojileri soyutlanmış olup, veritabanı değişiklikleri Domain katmanını etkilemez.
* **Dayanıklılık ve Güvenlik (Resilience & Security by Design):** Hata toleransı (Circuit Breaker, Retry), DDoS koruması ve mantıksal veri izolasyonu (Multi-Tenancy) mimarinin merkezindedir.
* **Test Edilebilirlik:** Tüm kullanım senaryoları (Use Cases) ve iş kuralları bağımsız unit ve entegrasyon testleri ile doğrulanabilir yapıdadır.

---

## 2. TEKNOLOJİ YIĞINI (TECH STACK)

| Katman | Teknoloji / Kütüphane | Kullanım Amacı |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v20+ LTS) & TypeScript | Yüksek I/O performansı, tip güvenliği ve geniş kütüphane ekosistemi. |
| **HTTP Framework** | Express.js | API yönlendirmesi, middleware yönetimi ve esnek entegrasyon. |
| **Frontend Framework**| React & TypeScript | Bileşen tabanlı UI, tip güvenliği ve reaktif kullanıcı deneyimi. |
| **Doküman DB / ODM** | MongoDB & Mongoose ODM | Esnek doküman/şema yönetimi, kullanıcı/chat geçmişi ve RBAC saklama. |
| **Vektör Veritabanı**| Qdrant | Yüksek performanslı vektör araması, payload bazlı multi-tenancy filtreleme. |
| **LLM Orkestrasyonu**| Vercel AI SDK | LLM soyutlama, embedding üretimi ve SSE tabanlı akış (streaming) yönetimi. |
| **Arka Plan İş Kuyruğu**| BullMQ & Redis | Doküman işleme (RAG Ingestion) ve ağır asenkron görevlerin yönetimi. |
| **Test Framework** | Vitest & Supertest | Hızlı unit, integration ve API testleri execution ortamı. |
| **Konteynerizasyon** | Docker & Docker Compose | Multi-container self-hosted / on-premise kurulum ve canlı ortam simülasyonu. |

---

## 3. CLEAN ARCHITECTURE VE KATMANLI MİMARİ

Sistem 4 temel Clean Architecture katmanına ayrılmıştır:

```
src/
├── domain/                  # 1. DOMAIN KATMANI (Saf İş Kuralları - Dış Bağımlılık Yok)
│   ├── entities/            # User, Tenant, Document, ChatSession, Role
│   ├── value-objects/       # VectorEmbedding, TokenUsage, UserPermissions
│   ├── errors/              # DomainError, UnauthorizedTenantError
│   └── repositories/        # Repository Arayüzleri (Interfaces)
│
├── application/             # 2. APPLICATION KATMANI (Kullanım Senaryoları / Use Cases)
│   ├── use-cases/           # IngestDocument, ProcessChatQuery, DownloadModel
│   ├── dtos/                # Zod Şemaları & DTO Tipleri
│   └── interfaces/          # ILLMProvider, IVectorStore, IQueueService
│
├── infrastructure/          # 3. INFRASTRUCTURE KATMANI (Dış Servis & DB Uygulamaları)
│   ├── database/
│   │   ├── mongodb/         # Mongoose Şemaları, Models & Repository Uygulamaları
│   │   └── qdrant/          # Qdrant Client & Vector Repository Implementation
│   ├── ai/                  # Vercel AI SDK Adapters (Ollama, vLLM, OpenAI, Anthropic)
│   ├── queue/               # BullMQ Worker & Queue Definitions
│   └── security/            # Encryption, JWT, Rate Limiter, Resilience (Circuit Breaker)
│
└── presentation/            # 4. PRESENTATION KATMANI (Dış Dünya Arayüzü)
    ├── http/                # Express Controllers, Middlewares, Routes
    └── sse/                 # Stream Handlers (SSE Event Streamers)
```

---

## 4. ÇOKLU KİRACILIK (MULTI-TENANCY) VE VERİ İZOLASYON STRATEJİSİ

MVP aşamasında verim ve bakım kolaylığı sağlamak adına **Row-Level Security (RLS) Mantıksal Ayrım** yaklaşımı BENİMSENMİŞTİR.

### 4.1. MongoDB (Mongoose) Katmanında İzolasyon
1. **Global Tenant Plugin:** Tüm Mongoose şemalarına `tenant_id` (ObjectId) ve `is_global` (Boolean) alanları zorunlu olarak eklenir.
2. **Automatic Query Hooks:** Mongoose middleware katmanında `pre('find')`, `pre('findOne')`, `pre('count')` ve `pre('aggregate')` kancaları tanımlanır.
3. **İzolasyon Mantığı:**
   - İsteği atan kullanıcının `tenant_id` bilgisi Express `async_hooks` veya Context Middleware üzerinden otomatik okunur.
   - Sorgular varsayılan olarak şu filtreye zorlanır:
     $$\text{Filter} = \{ \$or: [ \{ tenant\_id: \text{currentTenantId} \}, \{ is\_global: true \} ] \}$$
   - Bu sayede yazılımcı `.find()` çağrısında `tenant_id` yazmayı unutsa dahi başka bir kiracının verisine erişemez.

### 4.2. Qdrant Vektör Katmanında İzolasyon
* Qdrant koleksiyonlarında her vektör kaydı payload alanında `tenant_id` taşır.
* Similarity Search (Yakınlık Araması) atılırken Qdrant `Filter` nesnesi zorunlu olarak enjekte edilir:

```typescript
// Qdrant Filter Entegrasyonu (Örnek Mantık)
const filter = {
  must: [
    { key: "tenant_id", match: { value: currentTenantId } }
  ]
};
```

---

## 5. RAG (RETRIEVAL-AUGMENTED GENERATION) VE ASENKRON İŞ KUYRUĞU

Kullanıcıların yüklediği yüksek boyutlu dokümanların işlenmesi ana sunucu thread'ini tıkamamalıdır.

### 5.1. Doküman İşleme Akış Şeması (RAG Ingestion Pipeline)

```
[User UI] ──(1) HTTP Upload (Multer % Progress)──> [Express API]
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
* **Kaynak Koruması:** Sunucu CPU ve RAM kapasitesini aşırı yükten korumak adına her bir BullMQ Worker prosesi için eşzamanlı işleme sınırı tanımlanır (`concurrency: 2` veya `concurrency: 3`).
* Kuyrukta yüzlerce doküman birikse dahi sistem aynı anda yalnızca belirlenen sayıdaki dokümanı işler, kalan işler Redis üzerinde güvenle bekletilir.

#### 5.2.2. Hız Sınırlama (BullMQ Built-In Rate Limiting)
* Dış LLM sağlayıcılarının (OpenAI, Anthropic) veya yerel embedding modellerinin dakikalık istek limitlerine (RPM/TPM) takılmamak için BullMQ kuyruk seviyesinde `limiter` konfigürasyonu uygulanır:
  ```typescript
  // Örnek: Dakikada maksimum 50 embedding çıkarma işi çalıştır
  const queue = new Queue('rag-ingestion', {
    limiter: {
      max: 50,
      duration: 60000
    }
  });
  ```

#### 5.2.3. Redis Bellek Yönetimi ve Temizlik (Job Pruning)
* Tamamlanan ve başarısız olan işlerin metadatalarının Redis belleğini doldurarak sunucuyu Out-Of-Memory (OOM) durumuna düşürmemesi için otomatik silme politikası eklenir:
  ```typescript
  const defaultJobOptions = {
    removeOnComplete: { age: 3600, count: 100 }, // 1 saat sonra veya son 100 tamamlanan işi tut
    removeOnFail: { age: 86400, count: 500 }     // Hatalı işleri analiz için 24 saat sakla
  };
  ```

#### 5.2.4. Dosya Boyutuna Göre Önceliklendirme (Priority Queueing)
* Küçük boyutlu dokümanların (1-2 sayfalık PDF/sözleşmeler) büyük dokümanların (500 sayfalık teknik kılavuzlar) arkasında uzun süre beklemesini önlemek adına dinamik önceliklendirme algoritması uygulanır:
  $$\text{Priority Score} = \max(1, 1000 - \text{DosyaBoyutuKB})$$
* Düşük sayısal değer daha yüksek öncelik anlamına geldiğinden; küçük dosyalar kuyrukta anında öne geçer ve kullanıcılara hızlı geri bildirim sağlanır.

---

## 6. LLM ORKESTRASYONU VE YANIT AKIŞI (STREAMING)

### 6.1. Vercel AI SDK & Express SSE Entegrasyonu
* Express sunucusu LLM yanıtlarını tek yönlü ve gerçek zamanlı akıtmak için **Server-Sent Events (SSE)** protokolünü kullanır.
* Vercel AI SDK'nın `streamText` ve Express yanıt nesnesi (`res`) `pipeDataStreamToResponse` yardımcı metodu ile birbirine bağlanır.

### 6.2. Yan Yana Model Karşılaştırma (Side-by-Side Comparison)
* Kullanıcı aynı istemi (prompt) iki farklı modele gönderdiğinde, backend paralel olarak iki LLM akışı başlatır.
* SSE kanalı üzerinden istemciye parçalı JSON yapısı akıtılır:
  $$\text{Payload} = \{ modelId: "llama3", chunk: "Hello" \} \quad \text{veya} \quad \{ modelId: "gpt-4o", chunk: "Hi" \}$$
* Frontend tarafındaki React bileşeni `modelId` bilgisine göre ilgili mesaj kutusunu anlık olarak günceller.

---

## 7. DAYANIKLILIK (RESILIENCE) VE SİBER GÜVENLİK MİMARİSİ

### 7.1. Hata Yönetimi (Centralized Error Handling)
* Uygulama genelinde özel hata sınıfları hiyerarşisi kullanılır:
  * `AppError` (Ana Hata Sınıfı)
  * `DomainError` (İş kuralı ihlalleri)
  * `UnauthorizedTenantError` (Yetkisiz kiracı erişimi denemesi)
  * `LLMProviderError` (Dış servis hataları)
* Express `GlobalErrorHandler` middleware'i tüm yakalanmayan hataları formatlar. Üretim ortamında (Production) asla hassas stack trace veya DB iç yapısı dışarıya sızdırılmaz.

### 7.2. Yeniden Deneme (Retry) & Circuit Breaker
* Dış LLM sağlayıcılarına (OpenAI, Anthropic vb.) veya yerel Ollama servisine yapılan isteklerde **Exponential Backoff** (Üstel Bekleme) yeniden deneme stratejisi uygulanır.
* Bir LLM sağlayıcısı ardışık hatalar verdiğinde **Circuit Breaker** (Devre Kesici) devreye girer. Sistem istemciye anında "Servis geçici olarak kullanılamıyor" yanıtı dönerek sunucu kaynaklarını korur.

### 7.3. Ağ Güvenliği & DDoS Koruması
1. **Rate Limiting (İstek Sınırlama):**
   * `rate-limiter-flexible` ve Redis entegrasyonu ile IP bazlı ve Kullanıcı/Tenant bazlı API kotası uygulanır.
   * *Örn:* IP başına dakikada maksimum 100 istek, kullanıcı başına dakikada maksimum 20 chat isteği.
2. **Payload Size Sınırlaması:**
   * JSON gövde boyutu `express.json({ limit: '2mb' })` ile sınırlandırılır.
   * Dosya yüklemelerinde Multer seviyesinde maksimum dosya boyutu (ör. 20MB) ve MIME-Type kontrolü yapılır.
3. **Security Headers & CORS:**
   * `helmet` middleware'i ile HTTP güvenlik başlıkları (X-Frame-Options, CSP, HSTS) zorunlu kılınır.
   * CORS politikası strictly-configured domain listesi ile sınırlandırılır.

---

## 8. YEREL MODEL YÖNETİMİ (OLLAMA INTEGRATION)

Admin panelinden sunucuya yerel model indirilirken (`ollama pull`):
1. **Disk Kontrolü:** İndirme başlatılmadan önce sistem disk alanı kontrol edilir. Disk doluluğu %85'in üzerindeyse indirme engellenir.
2. **Progress Monitoring:** Express, Ollama API'sinin stream çıktısını dinler. İndirilen byte ve toplam boyut oranlanarak BullMQ/Redis üzerinden Admin UI'a anlık progress bar olarak aktarılır.
3. **Cancel Token:** İptal edilen indirmelerde yetim dosya oluşmaması için abort controller mekanizması işletilir.

---

## 9. ORTAM VE DAĞITIM PLANLAMASI (DOCKER)

Self-Hosted MVP kurulumu için tüm sistem bileşenleri `docker-compose.yml` altında izole edilmiştir.

### 9.1. Docker Compose Mimarisi

```yaml
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

---

## 10. TEST STRATEJİSİ

Proje **Test-Driven Development (TDD)** felsefesine uygun olarak aşağıdaki test katmanlarıyla geliştirilecektir:

1. **Unit Tests (Vitest):** Domain Entity'leri, Value Object'ler ve Use Case'lerin bağımsız iş mantığı testleri.
2. **Integration Tests (Vitest + Supertest):** Express route'ları, Mongoose repository'leri ve Qdrant entegrasyonlarının sahte (mock) veya test konteynerleri üzerinde doğrulanması.
3. **Security & Isolation Tests:** Farklı tenant kimlikleri ile atılan isteklerin izolasyonu ihlal etmediğini doğrulayan güvenlik otomasyon testleri.

---

## 11. SONUÇ VE SONRAKİ ADIMLAR

Bu Software Architecture Document (SAD v1.1), **Kurumsal LLM & Veri Yönetim Platformu** için güvenli, modüler, test edilebilir ve yüksek ölçeklenebilir bir temel sunmaktadır.

**Geliştirici Ekipleri İçin Başlangıç Adımları:**
1. Proje dizin yapısının Clean Architecture standartlarına göre oluşturulması.
2. `docker-compose up -d` ile altyapı servislerinin (MongoDB, Qdrant, Redis) ayağa kaldırılması.
3. Core Domain entity'lerinin ve Mongoose Global Tenant Plugin'inin kodlanmaya başlanması.