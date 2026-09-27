# ARCHITECTURE_RULES.md — AI Agent Backend & Güvenlik Kuralları

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (AI Agents)  
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
3. **Explicit Extension / Module Resolution:** TypeScript konfigürasyonunda `moduleResolution: "NodeNext"` (veya `Bundler`) kullanılarak modern Node.js modül çözünürlük standartlarına tam uyum sağlanır.

### Klasör Yapısı

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
   - Modüller arası asenkron etkileşimlerde (örneğin: Yeni tenant oluştuğunda varsayılan RAG klasörlerinin hazırlanması) Node.js `EventEmitter` veya `shared/events` kullanılır.

4. **Döngüsel Bağımlılık Yasağı (No Circular Dependencies):**
   - Modüller arasında bağımlılık döngüsü (`Auth -> Tenant -> Auth`) kesinlikle yasaktır. Ortak bağımlılıklar `shared/` katmanına veya bağımsız bir kontrata taşınmalıdır.

---

## 3. Multi-Tenancy: Row-Level Security (RLS)

Multi-Tenancy altyapısı `shared/database` altında merkezi olarak yönetilir ve tüm modüllerde standart olarak uygulanır.

### MongoDB (Mongoose) İzolasyonu

1. **Global Tenant Plugin (`shared/database/plugins/tenant.plugin.ts`):** Tüm Mongoose şemalarına `tenant_id: ObjectId` ve `is_global: Boolean` alanları otomatik eklenir.
2. **Query Hook'ları:** `pre('find')`, `pre('findOne')`, `pre('count')`, `pre('aggregate')` middleware'lerinde tenant filtresi enjekte edilir.
3. **Filtre Mantığı:**
   ```typescript
   // Otomatik enjekte edilen filtre:
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

## 4. Hata Yönetimi Hiyerarşisi

Hata sınıfları `shared/errors/` dizininde tanımlanır:

```
AppError (Ana Hata)
├── DomainError              → İş kuralı ihlalleri (400)
├── UnauthorizedTenantError  → Yetkisiz tenant erişimi (403)
├── LLMProviderError         → Dış LLM servis hataları (502/503)
├── ValidationError          → DTO/Zod doğrulama hataları (422)
└── NotFoundError            → Kaynak bulunamadı (404)
```

- Express `GlobalErrorHandler` middleware'i (`shared/middleware/error.middleware.ts`) tüm yakalanmayan hataları yakalar.
- Üretim ortamında stack trace **asla** istemciye döndürülmez.

---

## 5. Güvenlik Kuralları

### Rate Limiting (`shared/middleware/rate-limiter.ts`)

- IP bazlı: Dakikada maks. 100 istek.
- Kullanıcı bazlı: Dakikada maks. 20 chat isteği.
- Redis tabanlı `rate-limiter-flexible` ile uygulanır.

### Payload Sınırları

- JSON body: `express.json({ limit: '2mb' })`.
- Dosya yükleme: Multer ile maks. 20MB ve MIME-Type kontrolü.

### Security Headers

- `helmet` middleware ile X-Frame-Options, CSP, HSTS zorunlu.
- CORS: Yalnızca izin verilen domain'ler.

### LLM Dayanıklılık (`src/modules/chat` ve `src/modules/rag`)

- **Retry:** Dış LLM isteklerinde Exponential Backoff (3 deneme).
- **Circuit Breaker:** Ardışık 5 hatada devre kesilir, 30 saniye beklenir.

---

## 6. BullMQ İş Kuyruğu Kuralları (`src/modules/rag`)

### RAG Doküman İşleme Akışı

1. Kullanıcı doküman yükler → Express API (`rag.controller`) dosyayı kaydeder ve DB'de `PENDING` durumunda kayıt oluşturur.
2. BullMQ'ya iş eklenir → Worker (`rag.worker.ts`) metin çıkarır, parçalar (chunk), Vercel AI SDK ile embedding üretir, Qdrant'a `tenant_id` payload'ı ile kaydeder.
3. İş tamamlanınca DB durumu `COMPLETED` olarak güncellenir ve UI'a SSE ile bildirilir.

### Performans Kuralları

- Worker eşzamanlılık sınırı: `concurrency: 2` veya `3` (sunucu kapasitesine göre).
- Kuyruk hız sınırı: Dakikada maks. 50 embedding işi (`limiter: { max: 50, duration: 60000 }`).
- Tamamlanan işler: 1 saat veya son 100 iş saklanır (`removeOnComplete`).
- Başarısız işler: Analiz için 24 saat saklanır (`removeOnFail`).
- Dosya boyutuna göre önceliklendirme: Küçük dosyalar kuyruğun önüne alınır.

---

## 7. Yerel Model İndirme (`src/modules/ollama`)

Admin panelinden `ollama pull` tetiklendiğinde:

1. **Disk Kontrolü:** Doluluğu %85 üzerindeyse indirme engellenir.
2. **Progress Stream:** Ollama API çıktısı dinlenir → BullMQ/Redis üzerinden Admin UI'a canlı ilerleme aktarılır.
3. **Cancel Token:** İptal edilen indirmelerde abort controller ile yetim dosya oluşumu engellenir.
