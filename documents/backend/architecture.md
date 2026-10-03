# BACKEND YAZILIM MİMARİSİ VE TEKNİK TASARIM DOKÜMANI

> **DOKÜMAN TİPİ:** Alt Proje Özel Mimari Spesifikasyonu (`apps/backend`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_)  
> **İlişkili Dokümanlar:** [Ortak PRD v2.1.0](../common/prd.md), [Veritabanı ve İş Akış Şemaları](../common/data_and_business_workflows.md), [OpenAPI 3.0 Dokümanı](../openapi.json)  
> **Sürüm:** v1.3.0  
> **Hazırlayan:** Chief System Architect & Security Lead  
> **Tarih:** Ekim 2026  

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
│   ├── auth/           # Kimlik doğrulama, kullanıcılar, ban ve oturum yönetimi
│   ├── role/           # Dinamik RBAC, arketip tavanı ve yetki çözümleme motoru
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

## 4. KURUMSAL TEK ÇATI (ON-PREMISES) RBAC, ARKETİP TAVANI VE ROL BAZLI VERİ İZOLASYONU

Sistem tek kurum içi (on-premise / self-hosted) kullanım için tasarlandığından yapay SaaS multi-tenancy (`tenant_id`) soyutlamalarından tamamen arındırılmıştır. İzolasyon; kullanıcı (`user_id`), sistem rolleri (`system_role: 'superadmin' | 'admin' | 'user'`), ana arketip tavanı (`base_archetype: 'admin' | 'user'`), fonksiyonel departman rolleri (`roles: string[]`) ve kullanıcı bazlı yetki ezme (`custom_permissions: { allow, deny }`) üzerinden sağlanır.

### 4.1. 3 Seviyeli Hiyerarşi & Arketip Tavan Modeli (Permission Ceiling)

1. **Ana Roller Birer Yetki Potansiyeli ve Arketiptir:** Hazır statik bir admin veya user rolü yoktur. Roller oluşturulurken `admin` veya `user` arketipinden türer.
2. **Matematiksel Tavan Kontrolü:** `base_archetype: 'user'` olan bir role `admin:` ile başlayan izinler verilemez; yetki aşımı yazılımsal olarak engellenir.
3. **Standart 3 Parçalı İzin Formatı:** `<ana_rol_arketipi>:<kaynak/kategori>:<eylem>` (Örn: `admin:user:ban`, `admin:model:manage`, `user:chat:create`, `user:rag:read`).
4. **Admin Tarafından Belirlenen Varsayılan Rol:** Sistemde admin tarafından `is_default: true` olarak işaretlenen bir kullanıcı rolü bulunur. Yeni kaydolan/eklenen personellere bu rol otomatik atanır. Yalnızca `user` arketipine sahip roller varsayılan yapılabilir.
5. **Kullanıcı Spesifik Yetkilendirme (Override):** Bir personele istisnai durumlarda rolünden bağımsız doğrudan yetki verilebilir (`allow`) veya rolündeki bir yetki geri alınabilir (`deny`). Deny kontrolleri allow'dan önce değerlendirilir.
6. **Superadmin "Break-Glass" (Kök Hesap):** Superadmin günlük operasyonlarda kullanılmaz; rol verilip alınamaz, yetki ezme uygulanamaz. Yetkili yöneticilere `admin:user:assign_admin` yetkisi devredilerek kurum içi delegasyon sağlanır.

### 4.2. Open/Closed Prensibi (OCP) Yetkilendirme Motoru (`PolicyEngine`)

1. **5 Aşamalı Çözümleme Sırası:**
   - 1. Hesap aktif mi? (Banlıysa `false`)
   - 2. Superadmin mi? (Root bypass `true`)
   - 3. Kullanıcı Deny İstisnası var mı? (`custom_permissions.deny` içindeyse `false`)
   - 4. Kullanıcı Allow İstisnası var mı? (`custom_permissions.allow` içindeyse `true`)
   - 5. Rol İzinleri ve Kaynak Stratejileri (`roleService.getPermissionsForRoles`)
2. **Anlık Ban & Oturum İptali:** Banlanan veya yetkileri değişen personelin tüm oturumları `deleteAllSessionsForUser` ile anında sonlandırılır.

### 4.2. Qdrant Vektör & RAG Doküman Katmanında İzolasyon (`src/modules/rag`)

- Her doküman ve vektör parçası (`chunk`), payload alanında erişim izni olan rolleri (`allowed_roles: string[]`) taşır.
- Similarity Search (Yakınlık Araması) atılırken Qdrant `Filter` nesnesi kullanıcının aktif rolleriyle zorunlu olarak enjekte edilir:
```typescript
const filter = {
  should: [
    { key: "allowed_roles", match: { any: user.roles } },
    { key: "allowed_roles", match: { value: "*" } }
  ]
};
```
- **Rol filtresi enjekte edilmeden arama yapılması veri sızıntısı (Zero-Context-Leakage ihlali) sayılır.**
- Dokümanın rolleri güncellendiğinde (`PATCH /api/v1/rag/documents/:id/roles`), Qdrant'taki vektörlerin payload'undaki `allowed_roles` alanı anında senkronize edilir.

---

## 5. RAG (RETRIEVAL-AUGMENTED GENERATION) VE ASENKRON İŞ KUYRUĞU (`src/modules/rag`)

Kullanıcıların yüklediği yüksek boyutlu dokümanların işlenmesi ana sunucu thread'ini tıkamamalıdır.

### 5.1. Doküman İşleme Akış Şeması (RAG Ingestion Pipeline)

```
[User / Admin UI] ──(1) HTTP Upload (Multer % Progress)──> [RAG Controller]
                                                                  │
                                                        (2) Save File & Create DB Record (Status: PENDING)
                                                                  │
                                                                  ▼
                                                     [BullMQ Queue (Redis)]
                                                                  │
                                                                  ▼
                                                         [BullMQ Worker]
                                                                  │
                                ┌─────────────────────────────────┴─────────────────────────────────┐
                                │ - Text Extraction (PdfExtractor / PlainTextExtractor / Registry)   │
                                │ - Chunking Strategy (RecursiveCharacterChunker - 800 char/150 ov) │
                                │ - Vercel AI SDK (`generateEmbeddings`) -> 768/1536d Cosine Vector │
                                │ - Save Vectors to Qdrant (with allowed_roles Document ACL payload) │
                                │ - Update Job Progress (job.updateProgress(%))                    │
                                └─────────────────────────────────┬─────────────────────────────────┘
                                                                  │
                                                        (3) Update DB (Status: COMPLETED, chunk_count)
                                                                  │
                                                                  ▼
                                                     [Bull-Board & Real-Time Monitoring]
```

### 5.2. Kuyruk, Performans ve Kaynak Yönetimi Stratejileri

#### 5.2.1. Eşzamanlı Çalışma Sınırı (Worker Concurrency Control)
- **Kaynak Koruması:** Sunucu CPU ve RAM kapasitesini aşırı yükten korumak adına her bir BullMQ Worker prosesi için eşzamanlı işleme sınırı tanımlanır (`concurrency: 2` veya `concurrency: 3`).
- Kuyrukta yüzlerce doküman birikse dahi sistem aynı anda yalnızca belirlenen sayıdaki dokümanı işler, kalan işler Redis üzerinde güvenle bekletilir.

#### 5.2.2. Hız Sınırlama (BullMQ Built-In Rate Limiting)
- Dış LLM sağlayıcılarının (OpenAI, Anthropic) veya yerel embedding modellerinin dakikalık istek limitlerine (RPM/TPM) takılmamak için BullMQ kuyruk seviyesinde `limiter` konfigürasyonu uygulanır.

#### 5.2.3. Redis Bellek Yönetimi ve Temizlik (Job Pruning)
- Tamamlanan (`removeOnComplete: 1000`) ve başarısız olan (`removeOnFail: 5000`) işlerin metadatalarının Redis belleğini doldurarak sunucuyu Out-Of-Memory (OOM) durumuna düşürmemesi için otomatik silme politikası eklenir.

#### 5.2.4. Dosya Boyutuna Göre Önceliklendirme (Priority Queueing)
- Küçük boyutlu dokümanların (1-2 sayfalık PDF/sözleşmeler) büyük dokümanların arkasında beklemesini önlemek adına dinamik önceliklendirme uygulanır:
  $$\text{Priority Score} = \max(1, 1000 - \text{DosyaBoyutuKB})$$

### 5.3. Metin Çıkarıcılar ve Genişletilebilir Kayıtçı Mimarisi (`ExtractorRegistry`)
- **Open/Closed İlkesi:** Yeni bir dosya formatı (DOCX, HTML, EPUB) eklendiğinde mevcut kod değiştirilmez; `IDocumentExtractor` arayüzünü uygulayan yeni bir extractor yazılıp `extractorRegistry.register(extractor)` ile sisteme tanıtılır.
- **Mevcut Çıkarıcılar:**
  - `PlainTextExtractor`: `.txt`, `.md`, `.csv`, `.json` formatlarını UTF-8 güvenli ve satır sonu normalizasyonu ile işler.
  - `PdfExtractor`: `pdf-parse` motoru ile çok sayfalı PDF belgelerini ayrıştırır; sayfa sayısını ve sayfa bazlı metin haritasını (`metadata.page_number`) çıkarır.

### 5.4. Rekürsif Karakter Parçalama & Üst Boyut Normalizasyonu (`RecursiveChunker`)
- Doğal metin sınırlarını (paragraf `\n\n`, satır `\n`, cümle `. `, sözcük ` `) hiyerarşik olarak tarayan `RecursiveChunker` motoru kullanılır.
- Chunk boyutu ve örtüşme değerleri dinamik ayarlanabilir (varsayılan: `chunkSize: 800`, `chunkOverlap: 150` karakter).
- Her parça için üst veri (sayfa numarası, kaynak doküman ID, parça sıra indeksi) korunur.

### 5.5. Vercel AI SDK Embedding & Qdrant Vektör Adaptörü
- **Vektör Üretimi (`embedding.service.ts`):** Vercel AI SDK `embed` ve `embedMany` fonksiyonları kullanılarak metin parçacıkları kosinüs normalizasyonlu float vektörlerine dönüştürülür.
- **Qdrant Adaptörü (`qdrant.adapter.ts`):** 
  - Koleksiyon (`rag_documents_vectors`) yoksa otomatik oluşturulur (`Cosine` metriği ile).
  - Vektör parçaları `allowed_roles` payload'u ile saklanır.
  - **Zero-Context-Leakage Arama (`searchWithRoleFilter`):** Kullanıcının rolleri ile Qdrant payload'ı eşleştirilir; yetkisiz rollerin parçaları matematiksel olarak sorgu sonucuna dahil edilmez.
  - **Memory Fallback:** Test ve acil durumlarda Qdrant'a ulaşılamazsa bellek içi (in-memory) kosinüs benzerliği devreye girer.

### 5.6. Dinamik BullMQ Yapılandırma ve Çalışma Zamanı Hot-Reload (`rag-config.service.ts`)
- BullMQ worker concurrency, tekrar deneme sayısı (`attempts`), üstel geri çekilme (`backoff_delay_ms`), `chunk_size` ve `chunk_overlap` değerleri MongoDB `rag_configs` koleksiyonunda saklanır.
- Yönetici REST API (`PUT /api/admin/rag/config`) üzerinden ayar güncellediğinde, backend sunucusu yeniden başlatılmadan çalışma zamanında (hot-reload) `worker.concurrency` ve kuyruk parametreleri güncellenir.

### 5.7. Bull-Board Express Gösterge Paneli (`/admin/queues`)
- `@bull-board/express` ve `BullMQAdapter` entegrasyonu ile Express çatısı altında canlı kuyruk yönetim paneli sunulur.
- Yöneticiler kuyruktaki aktif, bekleyen, tamamlanan ve başarısız işleri grafiksel olarak izleyebilir, hatalı işleri tekrar deneyebilir (retry) veya kuyruğu temizleyebilir.

### 5.8. RAG Chat Grounding ve Canlı Citations Akışı (`chat.service.ts`)
- Sohbet isteğinde `enableRag: true` geldiğinde:
  1. Son kullanıcı mesajı `ragService.queryKnowledge` ile aranır.
  2. Kullanıcının rolleri doğrulanarak yalnızca erişim izni olan belgelerden alıntılar (`citations`) getirilir.
  3. Doküman adları (`documentTitle`), sayfa numaraları ve güven skorları birleştirilerek Prompt Stacking 4. Katmanına (`ragContext`) enjekte edilir.
  4. Vercel AI SDK `StreamData.appendMessageAnnotation` ile istemciye SSE akışında ilk veri olarak `rag-citations` annotasyonu aktarılır.
  5. Yanıt başlığına `x-nexusai-citations-count` eklenerek arayüzün anlık alıntı sayısını doğrudan okuyabilmesi sağlanır.

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

Sistem promptları tek bir metin alanı olarak `Conversation` koleksiyonuna gömülü statik bir yapıda tutulamaz. Her mesajda dinamik olarak 4 katman derlenir:
1. **Katman 1 - Kurumsal Güvenlik & İlke Kuralları (`system_guardrail`):** Kullanıcının rollerine göre filtrelenen, `priority` sırasına göre anlık sorgulanan katı güvenlik ve politika kuralları.
2. **Katman 2 - Uzmanlık Rolü / Persona (`persona`):** Sohbet oturumunun bağlı olduğu veya varsayılan atanan uzmanlık talimatı (Örn: Hukuk Danışmanı, Kıdemli Yazılımcı).
3. **Katman 3 - Oturuma Özel Ek Talimatlar (`custom_instructions`):** Kullanıcının ilgili oturuma özel anlık veya kalıcı eklediği serbest yönergeler (Örn: "Her zaman Türkçe ve maddeler halinde açıkla").
4. **Katman 4 - Kurumsal Bilgi Bankası ve Belge Alıntıları (`ragContext` - Grounding):** RAG aktif olduğunda kullanıcının sorusuna en yakın doğrulanmış belge parçacıkları ve alıntıları (Citations).
- **Gerçek Zamanlı Güncelleme:** Yönetici prompt güncellediği anda yeni deploy gerekmeksizin sonraki ilk mesajda tüm oturumlarda yürürlüğe girer.

---

## 13. CANLI API DOKÜMANTASYONU VE OPENAPI 3.0 SPESİFİKASYONU

Platformun tüm REST API uç noktaları tip güvenli OpenAPI 3.0 standardına göre belgelenir.
- **Zod & OpenAPI Entegrasyonu:** DTO'lar `@asteasolutions/zod-to-openapi` ile tanımlanır.
- **Swagger UI Web Arayüzü (`GET /api/docs`)**
- **Ham OpenAPI JSON Çıktısı (`GET /api/docs.json`)**
- **Statik Master Doküman (`documents/openapi.json`)**

---

## 14. CANLI GELİŞTİRİCİ TRAFİK VE STREAM İZLEYİCİSİ (DEV TRAFFIC & STREAM INSPECTOR)

Geliştirme ortamında çalışan backend HTTP isteklerini, dönen yanıtları ve LLM akışlarını (SSE / Vercel AI SDK) gözlemlemek için harici konsol pencereleri (`cmd.exe`) açmak geliştirici deneyimini karmaşıklaştırdığından; sistem **Web Tabanlı Canlı Trafik ve Stream İzleyici** mimarisine dönüştürülmüştür.

### 14.1. Mimari Prensipler ve Bileşenler
1. **Pencere Kirliliğini Önleme:** Backend başlatıldığında harici bir CMD terminal penceresi açılmaz; tüm veriler web arayüzlerine hazır hale getirilir.
2. **Döngüsel Bellek Tamponu (In-Memory Ring Buffer):** `DevInspectorHub` en son 100 HTTP istek ve yanıtını yapılandırılmış `DevTrafficEntry` nesneleri olarak bellekte saklar.
3. **Gerçek Zamanlı SSE Yayını (`GET /api/dev/inspector/events`):** `EventSource` protokolüyle bağlanan tüm istemcilere anlık HTTP logları ve LLM token akışları gecikmesiz iletilir.
4. **Döngü Engelleme (Self-Inspection Guard):** İzleyicinin kendi SSE ve log sorgulama istekleri (`/api/dev/inspector/*`, `/dev/inspector`) loglamadan hariç tutularak sonsuz döngü engellenir.
5. **Güvenlik ve Maskeleme:** Tüm istek ve yanıtlardaki hassas veriler (`authorization`, `cookie`, `password`, `token`) otomatik olarak maskelenir. Sadece `NODE_ENV !== 'production'` ortamında aktiftir.

### 14.2. API ve Test Arayüzü Uç Noktaları
- **`GET /dev/inspector` (ve `/dev-inspector`):** Geliştiricinin tarayıcıda hemen kullanabileceği, koyu temalı, filtreleme, arama, JSON önizleme ve test butonları içeren interaktif web arayüzü.
- **`GET /api/dev/inspector/logs`:** Bellekteki son 100 kaydı ve genel metrikleri (`totalRequests`, `errorCount`, `avgDurationMs`) döner.
- **`DELETE /api/dev/inspector/logs`:** Bellekteki kayıt geçmişini temizler ve bağlı SSE istemcilerini sıfırlar.
- **`GET /api/dev/inspector/events`:** `user-interface` veya harici web istemcilerinin doğrudan bağlanabileceği SSE akış uç noktası.

---

## 15. KURUMSAL DİNAMİK RBAC, ARKETİP TAVANI VE POLICY ENGINE (`src/modules/role`)

Sistem, geleneksel statik rol atamaları yerine kurumların organizasyonel ihtiyaçlarına uyum sağlayan **3 Seviyeli Arketip Tavanı (Ceiling Model)** ve **Policy Engine** mimarisini uygular.

### 15.1. Sistem Arketipleri ve SuperAdmin Dokunulmazlığı

1. **`superadmin` (Tekil & Dokunulmaz):**  
   - Sistemde yalnızca tek bir süper admin bulunabilir (`UserModel.system_role = 'superadmin'`).
   - Süper admin hiçbir role atanmaz veya rolü alınamaz; rolleri dinamik yetkilendirme dışındadır.
   - Herhangi bir yetki kontrolünde (`can()`), `system_role === 'superadmin'` ise koşulsuz olarak `true` döner.
   - Diğer adminler tarafından düzenlenemez, silinemez, banlanamaz ve yetkileri kısıtlanamaz.

2. **`admin` (Yönetici Arketipi - Yetki Tavanı):**  
   - SuperAdmin veya yetkilendirilmiş üst düzey admin tarafından atanır.
   - Rol ve kullanıcı yönetim yetkilerine sahip olabilir; ancak kendi arketip tavanını (`admin:*`) aşamaz.
   - Bir admin başka bir role ya da kullanıcıya hiçbir zaman kendi sahip olmadığı veya SuperAdmin seviyesindeki yetkileri veremez.

3. **`user` (Kullanıcı Arketipi):**  
   - Sistemin temel çalışma arketipidir (`user:*`).
   - Varsayılan roller veya departman rolleri bu arketipten türer.

### 15.2. Dinamik Rol Yönetimi (`RoleModel`)

- Roller veri tabanında dinamik olarak saklanır:
  - `slug`: Benzersiz anahtar (`hr-admin`, `senior-dev`, `default-user`).
  - `base_archetype`: `'admin'` veya `'user'`.
  - `permissions`: 3 parçalı izin string dizisi (`base_archetype:category:action`, örn: `admin:user:create`, `user:chat:create`).
  - `is_default`: Yeni kaydolan kullanıcılara otomatik atanacak rol bayrağı (Sistemde yalnızca 1 adet `is_default: true` olan `user` rolü bulunabilir).
  - `is_system`: Silinemez temel sistem rolleri.

### 15.3. Kullanıcı Bazlı Doğrudan İstisnalar (`direct_permissions`)

Roller departman bazlı genel yetki sağlarken; spesifik kullanıcılara geçici veya özel istisnalar tanımlamak için `UserModel.direct_permissions` yapısı kullanılır:
- `direct_permissions.allow`: Kullanıcının rollerinde olmasa dahi ekstra sahip olduğu izinler.
- `direct_permissions.deny`: Kullanıcının rollerinde olsa dahi özellikle yasaklanan (veto edilen) izinler.

### 15.4. Yetki Çözümleme Mantığı (Policy Engine Resolution)

`PolicyEngine.can(user, requiredPermission)` fonksiyonu şu öncelik sırasını çalıştırır:
1. **SuperAdmin Kontrolü:** `user.system_role === 'superadmin'` ise anında `true`.
2. **Explicit Deny Kontrolü:** `direct_permissions.deny` içinde `requiredPermission` (veya joker `*`) varsa anında `false`.
3. **Roller Havuzu (Union):** Kullanıcının tüm rollerindeki izinler birleştirilir; `requiredPermission` mevcutsa `true`.
4. **Explicit Allow Kontrolü:** `direct_permissions.allow` içinde `requiredPermission` varsa `true`.
5. **Varsayılan:** Eşleşme yoksa `false`.

### 15.5. Şema Geçiş Güvencesi ve Geriye Dönük Uyumluluk (Self-Healing)

Eski veritabanı sürümlerinden gelen dokümanlarda `role: 'superadmin'` alanı bulunabilirken yeni mimaride `system_role` kullanılır:
- **`AuthRepository`:** `hasSuperAdmin()` ve `findSuperAdmin()` sorguları `$or: [{ system_role: 'superadmin' }, { role: 'superadmin' }]` ile her iki alanı da denetler.
- **`userSchema.post('init')`:** Mongoose dokümanı okuduğunda eski `role` alanı mevcutsa ve `system_role` eksikse bellek üzerinde `this.system_role = (this as any).role` ataması yaparak kendini otomatik onarır (self-healing).


