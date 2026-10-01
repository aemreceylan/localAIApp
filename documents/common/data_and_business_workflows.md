# VERİTABANI MİMARİSİ, VARLIK İLİŞKİLERİ (ERD) VE İŞ MANTIĞI ÇALIŞMA ŞEMALARI

> **DOKÜMAN TİPİ:** Ortak Veritabanı ve İş Akışları Referansı (Tüm Monorepo: `backend`, `admin-interface`, `user-interface`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_)  
> **Doküman:** Veritabanı ve İş Mantığı Çalışma Şemaları (Data & Business Architecture Specification)  
> **Sürüm:** v1.0.0  
> **Tarih:** Eylül 2026  
> **Hedef Kitle:** Yazılım Mimarları, Backend/Frontend Geliştiricileri ve AI Kodlama Ajanları

---

## 1. Giriş ve Hibrit Veri Mimarisi Vizyonu

Platform, kurumsal güvenlik ve yüksek ölçeklenebilirlik gereksinimlerini karşılamak amacıyla **3 katmanlı hibrit bir veri mimarisi** üzerine inşa edilmiştir:

1. **İlişkisel/Operasyonel Doküman Katmanı (MongoDB & Mongoose):**  
   Kiracılar (Tenants), kullanıcılar, roller, dinamik promptlar, sohbet geçmişi ve doküman üst verileri (metadataları) Mongoose şemaları altında tutulur. Tüm koleksiyonlarda **Row-Level Security (RLS)** esasıyla `tenant_id` mantıksal izolasyonu uygulanır.
2. **Vektörel Arama ve Bilgi Bankası Katmanı (Qdrant Dedicated Vector DB):**  
   RAG dokümanlarından elde edilen metin parçacıklarının (chunks) vektör gömmeleri (embeddings) Qdrant üzerinde saklanır. Çok kiracılı veri izolasyonu, Qdrant payload filtreleri üzerinden sağlanır.
3. **Asenkron İş Kuyruğu ve Dağıtık Durum Katmanı (BullMQ & Redis):**  
   Büyük dokümanların parçalanması, embedding çıkarımı, Ollama model indirmeleri ve API hız sınırlamaları Redis destekli BullMQ kuyrukları ile yönetilir.

---

## 2. Bütünleşik Varlık İlişkileri Şeması (Entity Relationship Diagram - ERD)

Aşağıdaki şemada, MongoDB üzerindeki temel koleksiyonlar, aralarındaki 1-N ve referans ilişkileri ile Qdrant vektör koleksiyonunun ilişkisi gösterilmiştir:

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ PROMPT : defines
    TENANT ||--o{ CONVERSATION : owns
    TENANT ||--o{ DOCUMENT : stores
    TENANT ||--o{ TENANT_MODEL_CONFIG : configures
    USER ||--o{ CONVERSATION : creates
    USER ||--o{ SESSION : has
    CONVERSATION ||--o{ MESSAGE : contains
    PROMPT ||--o{ CONVERSATION : applies_to
    DOCUMENT ||--o{ QDRANT_VECTOR_CHUNK : chunked_into

    TENANT {
        string id PK
        string name "Kurum veya Sirket Adi"
        string slug UK "Benzersiz URL ve Tanimlayici"
        string status "active suspended pending"
        object settings "Model izinleri ve kotalar"
        date created_at "Olusturulma tarihi"
        date updated_at "Guncellenme tarihi"
    }

    USER {
        string id PK
        string tenant_id FK "Zorunlu Kiraci ID"
        string email UK "Benzersiz Eposta"
        string password_hash "Sifrelenmis parola hash"
        string first_name "Kullanici Adi"
        string last_name "Kullanici Soyadi"
        string role "superadmin tenant_admin user"
        boolean is_active "Hesap aktiflik durumu"
        date created_at "Olusturulma tarihi"
        date updated_at "Guncellenme tarihi"
    }

    SESSION {
        string id PK
        string token_hash UK "SHA256 Opaque Token Hash"
        string user_id FK "Kullanici ID"
        string tenant_id FK "Kiraci ID"
        string ip_address "Istemci IP Adresi"
        string user_agent "Tarayici ve Istemci Bilgisi"
        date expires_at "TTL Otomatik Silinme Tarihi"
        date last_active_at "Son Aktivite Tarihi"
        date created_at "Giris Tarihi"
    }

    TENANT_MODEL_CONFIG {
        string id PK
        string tenant_id FK "Kiraci ID"
        string model_id "Model kimligi"
        string provider "ollama openai anthropic vllm"
        boolean is_allowed "Kiraci erisim izni"
        boolean is_default "Varsayilan model secimi"
        object model_parameters "Model parametreleri"
        date updated_at "Guncellenme tarihi"
    }

    PROMPT {
        string id PK
        string tenant_id FK "Kiraci ID"
        string title "Prompt Persona Basligi"
        string slug "Tenant icinde benzersiz slug"
        string type "system_guardrail persona custom"
        string content "Sistem Direktifi ve Talimat Metni"
        boolean is_active "Kullanimda mi"
        boolean is_default "Tenant varsayilan personasi"
        int priority "Guardrail oncelik sirasi"
        date created_at "Olusturulma tarihi"
        date updated_at "Guncellenme tarihi"
    }

    CONVERSATION {
        string id PK
        string tenant_id FK "Kiraci ID"
        string user_id FK "Olusturan Kullanici ID"
        string title "Sohbet Basligi"
        string model "Kullanilan Model Adi"
        string prompt_id FK "Secili Persona ID"
        string custom_instructions "Oturuma Ozel Ek Talimat"
        date created_at "Olusturulma tarihi"
        date updated_at "Guncellenme tarihi"
    }

    MESSAGE {
        string id PK
        string conversation_id FK "Bagli Oldugu Oturum"
        string tenant_id FK "Kiraci Izolasyon ID"
        string role "user assistant system"
        string content "Mesaj Icerigi"
        date created_at "Gonderilme tarihi"
    }

    DOCUMENT {
        string id PK
        string tenant_id FK "Kiraci ID"
        string title "Dokuman Adi ve Basligi"
        string file_name "Orijinal Dosya Adi"
        string file_path "Depolama Dosya Yolu"
        int file_size "Bayt Cinsinden Boyut"
        string mime_type "Dosya tipi"
        string status "pending processing completed failed"
        int chunk_count "Uretilen Parca Sayisi"
        string error_message "Hata Detayi"
        object metadata "Ek etiketler ve departman"
        date created_at "Yuklenme tarihi"
        date updated_at "Guncellenme tarihi"
    }

    QDRANT_VECTOR_CHUNK {
        uuid point_id PK "Vektor Nokta ID"
        vector embedding "Gomme Vektor Dizisi"
        string tenant_id "Payload RLS Filtresi"
        string document_id "Kaynak Dokuman ID"
        int chunk_index "Parca Sira Numarasi"
        string text "Orijinal Parca Metni"
        object metadata "Sayfa No Baslik Bolum"
    }
```

---

## 3. Koleksiyon Şemaları ve Veri Sözlüğü (Data Dictionary)

### 3.1. `tenants` (Kurumsal Kiracılar)

Sistemin en üst düzey izolasyon birimidir. Tüm veriler bir kiracıya aittir.

| Alan Adı                    | Tip           | Zorunlu? | Varsayılan | İndeks | Açıklama                                              |
| :-------------------------- | :------------ | :------: | :--------: | :----: | :---------------------------------------------------- |
| `_id`                       | ObjectId      |   Evet   |    auto    |   PK   | Kiracı benzersiz kimliği                              |
| `name`                      | String (100)  |   Evet   |     -      |   -    | Kurum ticari unvanı                                   |
| `slug`                      | String (50)   |   Evet   |     -      | UNIQUE | URL ve alt alan adı tanımlayıcısı                     |
| `status`                    | String        |   Evet   | `'active'` | Index  | `'active'`, `'suspended'`, `'pending'`                |
| `settings.allowed_models`   | Array[String] |   Evet   |    `[]`    |   -    | Admin tarafından kiracıya atanan izinli LLM modelleri |
| `settings.default_model`    | String        |  Hayır   |   `null`   |   -    | Oturumlarda varsayılan önerilecek model adı           |
| `settings.max_storage_mb`   | Number        |   Evet   |   `1024`   |   -    | Kiracının RAG doküman saklama kotası (MB)             |
| `created_at` / `updated_at` | Date          |   Evet   |    auto    |   -    | Zaman damgaları                                       |

---

### 3.2. `users` (Kullanıcılar ve RBAC)

Sistemde oturum açan personeller.

| Alan Adı        | Tip               | Zorunlu? | Varsayılan |             İndeks             | Açıklama                                   |
| :-------------- | :---------------- | :------: | :--------: | :----------------------------: | :----------------------------------------- |
| `_id`           | ObjectId          |   Evet   |    auto    |               PK               | Kullanıcı kimliği                          |
| `tenant_id`     | String / ObjectId |   Evet   |     -      |         Compound Index         | Bağlı olduğu kurum                         |
| `email`         | String            |   Evet   |     -      | UNIQUE (`email` + `tenant_id`) | E-posta adresi                             |
| `password_hash` | String            |   Evet   |     -      |               -                | Şifrelenmiş parola özeti                   |
| `first_name`    | String            |   Evet   |     -      |               -                | Adı                                        |
| `last_name`     | String            |   Evet   |     -      |               -                | Soyadı                                     |
| `role`          | String            |   Evet   |  `'user'`  |             Index              | `'superadmin'`, `'tenant_admin'`, `'user'` |
| `is_active`     | Boolean           |   Evet   |   `true`   |             Index              | Hesap aktiflik durumu                      |

---

### 3.2.1. `sessions` (Kullanıcı Oturumları & Opaque Bearer Tokens)

Kullanıcıların aktif oturumlarını ve anlık ban/yetki iptalini yöneten veritabanı oturum koleksiyonu.

| Alan Adı         | Tip               | Zorunlu? | Varsayılan | İndeks                     | Açıklama                                                       |
| :--------------- | :---------------- | :------: | :--------: | :------------------------- | :------------------------------------------------------------- |
| `_id`            | ObjectId          |   Evet   |    auto    | PK                         | Oturum benzersiz kimliği                                       |
| `token_hash`     | String (64 hex)   |   Evet   |     -      | UNIQUE                     | Opaque Bearer Token'ın SHA-256 kriptografik özeti              |
| `user_id`        | ObjectId          |   Evet   |     -      | Compound (`user_id`, `tenant_id`) | Oturumu açan kullanıcı kimliği                                |
| `tenant_id`      | String            |   Evet   |     -      | Index                      | Kiracı kimliği                                                 |
| `ip_address`     | String            |  Hayır   |     -      | -                          | Oturum açılan istemci IP adresi                                |
| `user_agent`     | String            |  Hayır   |     -      | -                          | İstemci tarayıcı ve platform başlığı                           |
| `expires_at`     | Date              |   Evet   |   +7 gün   | TTL Index (`expireAfterSeconds: 0`) | Süresi dolan oturumları MongoDB otomatik siler                 |
| `last_active_at` | Date              |   Evet   |    auto    | -                          | Son HTTP isteği zaman damgası (Anlık aktivite takibi)          |
| `created_at`     | Date              |   Evet   |    auto    | -                          | Oturum başlangıç zamanı                                        |

---

### 3.3. `prompts` (Dinamik Prompt Stacking Motoru)

Promptlar artık oturum içine gömülü statik metinler değildir. 3 farklı tipte dinamik derlenir:

| Alan Adı     | Tip          | Zorunlu? | Varsayılan  |                    İndeks                     | Açıklama                                           |
| :----------- | :----------- | :------: | :---------: | :-------------------------------------------: | :------------------------------------------------- |
| `_id`        | ObjectId     |   Evet   |    auto     |                      PK                       | Prompt kimliği                                     |
| `tenant_id`  | String       |   Evet   |      -      |                Compound Index                 | Kiracı kimliği                                     |
| `title`      | String (150) |   Evet   |      -      |                       -                       | Başlık (Örn: "KVKK & Finansal Güvenlik Guardrail") |
| `slug`       | String       |   Evet   |      -      |        Compound (`tenant_id` + `slug`)        | Kod içi ve API erişim slug'ı                       |
| `type`       | String       |   Evet   | `'persona'` | Compound (`tenant_id` + `type` + `is_active`) | `'system_guardrail'`, `'persona'`, `'custom'`      |
| `content`    | String       |   Evet   |      -      |                       -                       | LLM'e enjekte edilecek gerçek talimat              |
| `is_active`  | Boolean      |   Evet   |   `true`    |                     Index                     | Aktiflik anahtarı                                  |
| `is_default` | Boolean      |   Evet   |   `false`   |                       -                       | Tenant için varsayılan persona mı?                 |
| `priority`   | Number       |   Evet   |     `0`     |                       -                       | Guardrail birleştirme öncelik sırası               |

---

### 3.4. `conversations` (Sohbet Oturumları)

| Alan Adı              | Tip           | Zorunlu? |   Varsayılan    |                İndeks                 | Açıklama                                               |
| :-------------------- | :------------ | :------: | :-------------: | :-----------------------------------: | :----------------------------------------------------- |
| `_id`                 | ObjectId      |   Evet   |      auto       |                  PK                   | Oturum kimliği                                         |
| `tenant_id`           | String        |   Evet   |        -        | Compound (`tenant_id` + `updated_at`) | RLS İzolasyon anahtarı                                 |
| `title`               | String (200)  |   Evet   | `'Yeni Sohbet'` |                   -                   | Sohbet başlığı                                         |
| `model`               | String        |   Evet   |        -        |                   -                   | Zorunlu seçilen LLM adı (Hardcode yasaktır!)           |
| `prompt_id`           | ObjectId      |  Hayır   |     `null`      |                 Index                 | Bağlı olunan Persona (`prompts` koleksiyonu referansı) |
| `custom_instructions` | String (2000) |  Hayır   |     `null`      |                   -                   | Kullanıcının bu oturuma özel eklediği yönergeler       |

---

### 3.5. `messages` (Sohbet Mesajları)

| Alan Adı          | Tip      | Zorunlu? | Varsayılan |                   İndeks                    | Açıklama                                |
| :---------------- | :------- | :------: | :--------: | :-----------------------------------------: | :-------------------------------------- |
| `_id`             | ObjectId |   Evet   |    auto    |                     PK                      | Mesaj kimliği                           |
| `conversation_id` | ObjectId |   Evet   |     -      | Compound (`conversation_id` + `created_at`) | Bağlı olduğu oturum                     |
| `tenant_id`       | String   |   Evet   |     -      | Compound (`tenant_id` + `conversation_id`)  | Çift katmanlı RLS kontrolü              |
| `role`            | String   |   Evet   |     -      |                      -                      | `'user'`, `'assistant'`, `'system'`     |
| `content`         | String   |   Evet   |     -      |                      -                      | Mesaj içeriği (Markdown destekli metin) |
| `created_at`      | Date     |   Evet   |    auto    |                      -                      | Mesaj zaman damgası                     |

---

### 3.6. `documents` (RAG Bilgi Bankası Üst Verileri)

| Alan Adı        | Tip      | Zorunlu? | Varsayılan  |              İndeks               | Açıklama                                               |
| :-------------- | :------- | :------: | :---------: | :-------------------------------: | :----------------------------------------------------- |
| `_id`           | ObjectId |   Evet   |    auto     |                PK                 | Doküman kimliği                                        |
| `tenant_id`     | String   |   Evet   |      -      | Compound (`tenant_id` + `status`) | Kiracı izolasyon anahtarı                              |
| `title`         | String   |   Evet   |      -      |                 -                 | Doküman başlığı                                        |
| `file_name`     | String   |   Evet   |      -      |                 -                 | Orijinal dosya adı                                     |
| `file_path`     | String   |   Evet   |      -      |                 -                 | Sunucu yerel depolama dosya yolu                       |
| `file_size`     | Number   |   Evet   |      -      |                 -                 | Bayt cinsinden boyut                                   |
| `mime_type`     | String   |   Evet   |      -      |                 -                 | `application/pdf`, `text/markdown` vb.                 |
| `status`        | String   |   Evet   | `'pending'` |               Index               | `'pending'`, `'processing'`, `'completed'`, `'failed'` |
| `chunk_count`   | Number   |   Evet   |     `0`     |                 -                 | Qdrant'a yazılan vektör parçası adedi                  |
| `error_message` | String   |  Hayır   |   `null`    |                 -                 | Başarısızlık durumunda hata logu                       |

---

### 3.7. Qdrant Vektör Koleksiyonu Şeması (`rag_documents_vectors`)

Qdrant üzerinde her vektör kaydı bir `Point` nesnesidir:

- **Point ID:** UUIDv4 formatında benzersiz parça kimliği.
- **Vector:** Model embedding çıktısı (örn: 1536 float değerleri).
- **Payload (Filtrelenebilir Meta Veri):**
  ```json
  {
    "tenant_id": "tenant_123",
    "document_id": "66f91a2b...",
    "chunk_index": 4,
    "text": "Kurumumuz bünyesinde veri güvenliği...",
    "metadata": {
      "filename": "guvenlik_kilavuzu.pdf",
      "page_number": 12,
      "section": "Gizlilik Prensipleri"
    }
  }
  ```

---

## 4. İş Mantığı ve Çalışma Akış Şemaları (Workflows & Sequences)

### 4.1. Akış 1: LLM Mesaj Gönderimi & Dinamik Prompt Stacking Akışı

Kullanıcı bir mesaj gönderdiğinde sistemin yanıt üretme, güvenlik guardrail'lerini uygulama ve veritabanına yazma sırası:

```mermaid
sequenceDiagram
    autonumber
    actor User as Kullanıcı (UI)
    participant Gateway as Express Gateway (Auth/RLS Middleware)
    participant ChatCtrl as ChatController
    participant ChatSvc as ChatService
    participant PromptFacade as PromptService (Facade)
    participant AIProvider as AIProviderService (Ollama / OpenAI)
    participant DB as MongoDB (Message / Conversation)

    User->>Gateway: POST /api/chat (tenant_id, conversation_id, content, model)
    Note over Gateway: Auth Token & Tenant RLS Context doğrulanır
    Gateway->>ChatCtrl: handleSendMessage(req)
    ChatCtrl->>ChatSvc: sendMessage(tenant_id, conversation_id, dto)

    rect rgb(240, 245, 255)
    Note over ChatSvc, PromptFacade: Çok Katmanlı Dinamik Prompt Derleme
    ChatSvc->>PromptFacade: buildSystemInstruction(tenant_id, prompt_id, custom_instructions)
    PromptFacade->>DB: 1. Aktif Kurumsal Guardrail'leri getir (priority ASC)
    PromptFacade->>DB: 2. Seçili/Varsayılan Persona Promptunu getir
    PromptFacade-->>ChatSvc: Katman 1 + Katman 2 + Katman 3 Birleşik Sistem Metni
    end

    ChatSvc->>DB: Son N mesajı geçmiş olarak çek (Context Window)
    ChatSvc->>AIProvider: streamChat(model, combinedSystemPrompt, messagesHistory)
    AIProvider-->>User: Server-Sent Events (SSE) Token Akışı Başlar...
    AIProvider-->>User: Token 1, Token 2, Token 3...
    AIProvider-->>ChatSvc: Akış Tamamlandı (Tam Yanıt Metni)

    ChatSvc->>DB: User Mesajını Kaydet (role: 'user')
    ChatSvc->>DB: Assistant Yanıtını Kaydet (role: 'assistant')
    ChatSvc->>DB: Conversation.updated_at güncelle
    ChatSvc-->>User: SSE Bitiş Olayı ([DONE])
```

---

### 4.2. Akış 2: RAG Doküman Yükleme ve Asenkron İşleme Pipeline'ı (Ingestion)

Yüksek boyutlu kurumsal dokümanların ana HTTP thread'ini bloke etmeden BullMQ worker'ları ve Qdrant ile işlenmesi:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin / Kullanıcı
    participant API as RAG Controller (Multer)
    participant DB as MongoDB (Document)
    participant Queue as BullMQ Ingestion Queue (Redis)
    participant Worker as BullMQ Ingestion Worker
    participant AIEmbed as Embedding Servisi
    participant Qdrant as Qdrant Vektör DB
    participant SSE as SSE Notification Channel

    Admin->>API: POST /api/rag/upload (Multipart File + Metadata)
    API->>API: Disk / Temporary Storage'a kaydet & MIME kontrolü
    API->>DB: Document kaydı oluştur (status: 'pending')
    API->>Queue: Yeni iş ekle (Job: { documentId, tenantId, filePath })
    API-->>Admin: 202 Accepted (Document ID & Durum: PENDING)

    rect rgb(245, 255, 245)
    Note over Queue, Worker: Asenkron Arka Plan İşlemi
    Queue->>Worker: Job tetiklenir (Concurrency Control: 2-3)
    Worker->>DB: Status -> 'processing' olarak güncelle
    Worker->>Worker: Metin Çıkarıcı (PDF / DOCX / TXT Parser)
    Worker->>Worker: Recursive Character Splitting (Örn: 800 token chunk + 100 overlap)
    Worker->>AIEmbed: embedMany(chunks) -> Vektör dizileri üret
    AIEmbed-->>Worker: Vektör embedding matrisi döner
    Worker->>Qdrant: Batch Upsert Points (Payload: { tenant_id, document_id, text, metadata })
    Qdrant-->>Worker: Index OK
    Worker->>DB: Status -> 'completed', chunk_count -> N güncelle
    Worker->>SSE: Yayınla: document_processed (status: completed)
    SSE-->>Admin: UI'da bildirim gösterilir ve durum yeşile döner
    end
```

---

### 4.3. Akış 3: RAG Destekli Chat Arama ve Yanıt Üretimi (Retrieval Flow)

Kullanıcı RAG aramasını aktif ederek bir soru sorduğunda Qdrant ve LLM entegrasyonu:

```mermaid
flowchart TD
    A["Kullanıcı Sorusu (Örn: 2026 Bütçe Raporu Özeti)"] --> B["Chat Controller / Service"]
    B --> C{"RAG Aktif mi?"}
    C -- Hayır --> D["Standart LLM İstek Akışına Devam Et"]
    C -- Evet --> E["Soru için Embedding Vektörü Üret (embed)"]
    E --> F["Qdrant Similarity Search Sorgusu Gönder"]

    subgraph Qdrant_RLS_Filtreleme ["Qdrant Multi-Tenancy Güvenlik Filtresi"]
        F --> G["Filtre: must tenant_id eşleşmesi"]
        G --> H["Kosinüs Benzerliği Hesapla - Top-K En Alakalı Parçalar"]
    end

    H --> I["Alakalı Parçaları Metin Olarak Birleştir: Context Bloğu"]
    I --> J["Prompt Stacking Motoru: Context Enjeksiyonu"]

    subgraph Prompt_Derleme ["Nihai İstem"]
        J --> K["1. Kurumsal Guardrail Kuralları"]
        K --> L["2. Seçili Persona"]
        L --> M["3. Doküman Bağlamı Metni"]
        M --> N["4. Kullanıcı Sorusu ve Sohbet Geçmişi"]
    end

    N --> O["LLM Sağlayıcıya İlet (Ollama / OpenAI)"]
    O --> P["SSE ile İstemciye Streaming Yanıt"]
```

---

### 4.4. Akış 4: Multi-Tenant Row-Level Security (RLS) Karar Akışı

Gelen her isteğin yetkisiz kiracıların verilerine erişmesini engelleyen güvenlik akışı:

```mermaid
flowchart TD
    Req["Gelen HTTP İsteği"] --> MW1["Auth ve JWT Middleware"]
    MW1 --> MW2["Tenant Context Middleware"]
    MW2 --> SetCtx["AsyncLocalStorage Context: tenant_id belirlenir"]

    SetCtx --> ModService["İlgili Modül Servisi (chat, prompt, rag vb.)"]
    ModService --> ModRepo["Modül Repository Katmanı"]

    subgraph Mongo_RLS ["Mongoose Global Tenant Plugin Katmanı"]
        ModRepo --> QueryHook["pre('find') Kancası Tetiklenir"]
        QueryHook --> InjectFilter["Otomatik Filtre: tenant_id veya is_global"]
        InjectFilter --> MongoExec["MongoDB Sorgusu Çalıştırılır"]
    end

    subgraph Qdrant_RLS ["Qdrant Vektör Güvenlik Katmanı"]
        ModRepo --> QdrantSearch["search veya scroll Çağrısı"]
        QdrantSearch --> InjectQdrantFilter["Payload Filtresi: tenant_id eşleşmesi"]
        InjectQdrantFilter --> QdrantExec["Qdrant Arama Çalıştırılır"]
    end

    MongoExec --> Result["Yalnızca Kiracının Kendi Verileri Döner"]
    QdrantExec --> Result
    Result --> Res["Güvenli HTTP Yanıtı"]
```

---

## 5. Modüler Monolit Facade ve İletişim Standartları

[AGENTS.md](../../AGENTS.md) 3. kuralı uyarınca: **Modüller birbirlerinin veritabanı modellerini doğrudan import edemez.** Modüller arası tüm etkileşim yalnızca modülün kökündeki `index.ts` üzerinden yürütülür.

### Modül İletişim Arayüzleri Tablosu

| İsteyen Modül | Hedef Modül | İzin Verilen Facade Metodu / Event                                              | Gerekçe / Kullanım Amacı                                       |
| :------------ | :---------- | :------------------------------------------------------------------------------ | :------------------------------------------------------------- |
| `chat`        | `prompt`    | `promptService.buildSystemInstruction(tenantId, promptId, custom)`              | Çok katmanlı promptu anlık derlemek                            |
| `chat`        | `auth`      | `authService.validateUser(userId, tenantId)`                                    | Kullanıcının aktifliğini ve kiracı yetkisini denetlemek        |
| `chat`        | `ai`        | `aiProviderService.streamText(model, prompt, messages)`                         | LLM çıkarımını başlatmak                                       |
| `chat`        | `rag`       | `ragService.queryContext(tenantId, query, topK)`                                | RAG destekli sohbette benzer doküman parçalarını getirmek      |
| `rag`         | `ai`        | `aiProviderService.embedMany(texts)`                                            | Chunk parçaları için embedding vektörleri üretmek              |
| `tenant`      | `prompt`    | `Event: tenant.created` $\rightarrow$ `promptService.createDefaultPrompts()`    | Yeni kurum açıldığında varsayılan persona ve kuralları üretmek |
| `tenant`      | `chat`      | `Event: tenant.suspended` $\rightarrow$ `chatService.terminateActiveSessions()` | Kurum askıya alındığında aktif bağlantıları kesmek             |

---

## 6. Özet ve Uygulama Kontrol Listesi

- [x] **MongoDB Şemaları:** `Tenant`, `User`, `Prompt`, `Conversation`, `Message`, `Document` ilişkileri ve indeksleri tanımlandı.
- [x] **Dinamik Prompt Stacking:** 3 katmanlı derleme sırası (Guardrail $\rightarrow$ Persona $\rightarrow$ Custom) şemalaştırıldı.
- [x] **Qdrant Vektör İzolasyonu:** Vektör payload şeması ve `tenant_id` filtresi netleştirildi.
- [x] **RAG Pipeline:** BullMQ eşzamanlı çalışma, Redis ve SSE ilerleme akışları bağlandı.
- [x] **Modüler Monolit İzolasyonu:** Modüller arası Facade sözlüğü ve cross-DB import yasağı dokümante edildi.
