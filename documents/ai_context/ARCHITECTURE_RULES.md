# ARCHITECTURE_RULES.md — AI Agent Backend & Güvenlik Kuralları

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (AI Agents)  
> **AMAC:** Backend kodu yazarken uyulması zorunlu olan Clean Architecture katman kuralları, Multi-Tenancy izolasyonu ve güvenlik kalıpları.

---

## 1. Teknoloji Yığını (Referans)

| Katman | Teknoloji | Amacı |
| :--- | :--- | :--- |
| Runtime | Node.js (v20+ LTS) + TypeScript | Tip güvenli asenkron I/O |
| HTTP | Express.js | API routes, middleware |
| Doküman DB | MongoDB + Mongoose ODM | Kullanıcı, chat, rol, audit verileri |
| Vektör DB | Qdrant | RAG embedding araması |
| LLM Orkestrasyon | Vercel AI SDK | Model soyutlama, streaming |
| İş Kuyruğu | BullMQ + Redis | Ağır async işler (RAG ingestion) |
| Test | Vitest + Supertest | Unit, integration, API testleri |

---

## 2. Clean Architecture — 4 Katman Kuralları

```
src/
├── domain/          # KATMAN 1: Saf iş kuralları (SIFIR dış bağımlılık)
├── application/     # KATMAN 2: Use case'ler, DTO'lar, arayüzler
├── infrastructure/  # KATMAN 3: DB, AI, Queue, Security uygulamaları
└── presentation/    # KATMAN 4: Express controller'lar, SSE handler'lar
```

### Katman 1 — Domain (Saf TypeScript)
**MUTLAK KURAL:** Bu katmanda `import` ifadelerinde aşağıdakiler **asla** bulunamaz:
- `express`, `mongoose`, `qdrant`, `bullmq`, `redis`, `@ai-sdk/*`, `jsonwebtoken`
- `node:fs`, `node:http` veya herhangi bir Node.js çekirdek modülü

Bu katman yalnızca şunları içerir:
- **Entities:** `User`, `Tenant`, `Document`, `ChatSession`, `Role`
- **Value Objects:** `VectorEmbedding`, `TokenUsage`, `UserPermissions`
- **Domain Errors:** `DomainError`, `UnauthorizedTenantError`
- **Repository Interfaces:** `IUserRepository`, `IChatRepository` (sadece interface tanımları)

### Katman 2 — Application (Use Cases)
- Use case sınıfları domain entity'lerini ve repository arayüzlerini kullanır.
- DTO tipleri Zod şemaları ile tanımlanır ve giriş doğrulaması burada yapılır.
- Dış servis arayüzleri: `ILLMProvider`, `IVectorStore`, `IQueueService` (sadece interface).

### Katman 3 — Infrastructure
- Mongoose şemaları, Qdrant client, BullMQ worker/queue tanımları, JWT/Encryption.
- Repository interface'lerinin somut uygulamaları (implementations) burada yazılır.

### Katman 4 — Presentation
- Express controller'lar, route tanımları, middleware'ler.
- SSE stream handler'lar (Vercel AI SDK `pipeDataStreamToResponse`).
- CORS, Helmet ve rate limiter konfigürasyonları.

---

## 3. Multi-Tenancy: Row-Level Security (RLS)

### MongoDB (Mongoose) İzolasyonu
1. **Global Tenant Plugin:** Tüm Mongoose şemalarına `tenant_id: ObjectId` ve `is_global: Boolean` alanları otomatik eklenir.
2. **Query Hook'ları:** `pre('find')`, `pre('findOne')`, `pre('count')`, `pre('aggregate')` middleware'lerinde tenant filtresi enjekte edilir.
3. **Filtre Mantığı:**
   ```typescript
   // Otomatik enjekte edilen filtre:
   { $or: [{ tenant_id: currentTenantId }, { is_global: true }] }
   ```
4. **Bypass Yok:** Geliştiricinin `.find()` çağrısında `tenant_id` yazmayı unutması tehlikesiz olacak şekilde hook katmanı her zaman filtreyi zorlar.

### Qdrant Vektör İzolasyonu
- Her vektör kaydı payload'ında `tenant_id` taşır.
- Similarity search sırasında Qdrant `Filter` nesnesi zorunlu olarak eklenir:
  ```typescript
  const filter = {
    must: [{ key: "tenant_id", match: { value: currentTenantId } }]
  };
  ```
- **Filtresiz arama yapan fonksiyon yazılırsa bu güvenlik ihlali sayılır.**

---

## 4. Hata Yönetimi Hiyerarşisi

```
AppError (Ana Hata)
├── DomainError              → İş kuralı ihlalleri (400)
├── UnauthorizedTenantError  → Yetkisiz tenant erişimi (403)
├── LLMProviderError         → Dış LLM servis hataları (502/503)
├── ValidationError          → DTO/Zod doğrulama hataları (422)
└── NotFoundError            → Kaynak bulunamadı (404)
```

- Express `GlobalErrorHandler` middleware'i tüm yakalanmayan hataları yakalar.
- Üretim ortamında stack trace **asla** istemciye döndürülmez.

---

## 5. Güvenlik Kuralları

### Rate Limiting
- IP bazlı: Dakikada maks. 100 istek.
- Kullanıcı bazlı: Dakikada maks. 20 chat isteği.
- Redis tabanlı `rate-limiter-flexible` ile uygulanır.

### Payload Sınırları
- JSON body: `express.json({ limit: '2mb' })`.
- Dosya yükleme: Multer ile maks. 20MB ve MIME-Type kontrolü.

### Security Headers
- `helmet` middleware ile X-Frame-Options, CSP, HSTS zorunlu.
- CORS: Yalnızca izin verilen domain'ler.

### LLM Dayanıklılık
- **Retry:** Dış LLM isteklerinde Exponential Backoff (3 deneme).
- **Circuit Breaker:** Ardışık 5 hatada devre kesilir, 30 saniye beklenir.

---

## 6. BullMQ İş Kuyruğu Kuralları

### RAG Doküman İşleme Akışı
1. Kullanıcı doküman yükler → Express API dosyayı kaydeder ve DB'de `PENDING` durumunda kayıt oluşturur.
2. BullMQ'ya iş eklenir → Worker metin çıkarır, parçalar (chunk), Vercel AI SDK ile embedding üretir, Qdrant'a `tenant_id` payload'ı ile kaydeder.
3. İş tamamlanınca DB durumu `COMPLETED` olarak güncellenir ve UI'a SSE ile bildirilir.

### Performans Kuralları
- Worker eşzamanlılık sınırı: `concurrency: 2` veya `3` (sunucu kapasitesine göre).
- Kuyruk hız sınırı: Dakikada maks. 50 embedding işi (`limiter: { max: 50, duration: 60000 }`).
- Tamamlanan işler: 1 saat veya son 100 iş saklanır (`removeOnComplete`).
- Başarısız işler: Analiz için 24 saat saklanır (`removeOnFail`).
- Dosya boyutuna göre önceliklendirme: Küçük dosyalar kuyruğun önüne alınır.

---

## 7. Yerel Model İndirme (Ollama Entegrasyonu)

Admin panelinden `ollama pull` tetiklendiğinde:
1. **Disk Kontrolü:** Doluluğu %85 üzerindeyse indirme engellenir.
2. **Progress Stream:** Ollama API çıktısı dinlenir → BullMQ/Redis üzerinden Admin UI'a canlı ilerleme aktarılır.
3. **Cancel Token:** İptal edilen indirmelerde abort controller ile yetim dosya oluşumu engellenir.
