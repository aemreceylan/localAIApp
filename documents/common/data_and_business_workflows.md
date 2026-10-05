# VERİTABANI MİMARİSİ, VARLIK İLİŞKİLERİ (ERD) VE İŞ MANTIĞI ÇALIŞMA ŞEMALARI

> **DOKÜMAN TİPİ:** Ortak Veritabanı ve İş Akışları Referansı (Tüm Monorepo: `backend`, `admin-interface`, `user-interface`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_Chotonack AI — Gateway & Knowledge Base_)  
> **Doküman:** Veritabanı ve İş Mantığı Çalışma Şemaları (Data & Business Architecture Specification)  
> **Sürüm:** v1.0.0  
> **Tarih:** Eylül 2026  
> **Hedef Kitle:** Yazılım Mimarları, Backend/Frontend Geliştiricileri ve AI Kodlama Ajanları

---

## 1. Giriş ve Hibrit Veri Mimarisi Vizyonu

Platform, kurumsal güvenlik ve yüksek ölçeklenebilirlik gereksinimlerini karşılamak amacıyla **3 katmanlı hibrit bir veri mimarisi** üzerine inşa edilmiştir:

1. **İlişkisel/Operasyonel Doküman Katmanı (MongoDB & Mongoose):**  
   Kullanıcılar (`users`), oturumlar (`sessions`), dinamik roller (`roles`), 4 katmanlı promptlar (`prompts`), sohbet geçmişi (`conversations`, `messages`), doküman üst verileri (`documents`) ve kuyruk ayarları (`rag_configs`) Mongoose şemaları altında tutulur. Veri erişimi **Enterprise RBAC**, **Document ACL** (`allowed_roles`) ve kullanıcı bazlı sahiplik (`user_id`) ile izole edilir.
2. **Vektörel Arama ve Bilgi Bankası Katmanı (Qdrant Dedicated Vector DB):**  
   RAG dokümanlarından elde edilen metin parçacıklarının (chunks) vektör gömmeleri (embeddings) Qdrant üzerinde saklanır. Rol bazlı kurumsal veri izolasyonu (**Zero-Context-Leakage**), Qdrant payload filtreleri (`allowed_roles`) üzerinden matematiksel olarak garanti edilir.
3. **Asenkron İş Kuyruğu, Dağıtık Önbellek ve Durum Katmanı (BullMQ & Redis):**  
   - **Dağıtık Oturum Önbellekleme:** Opaque Bearer token doğrulamaları Redis üzerinden alt-milisaniye hızında (`auth:session:${tokenHash}`) çözümlenir; veritabanı yazma yükü `last_active_at` güncellemesinin 5 dakikada bire kısıtlanmasıyla (throttling) %99'un üzerinde azaltılır. Ban ve yetki değişikliklerinde oturum anahtarları Redis'ten anında düşürülür (Zero-Token-Leakage).
   - **Dinamik Prompt Stacking Önbelleği:** Sistem promptları ve guardrail kuralları Redis Read-Through önbelleği (`prompt:guardrail:${rolesKey}`, `prompt:persona:id:${id}`) ile <1ms sürede derlenir. Prompt ekleme, güncelleme veya silme işlemlerinde `cacheService.delPattern('prompt:*')` ile Redis önbelleği anında geçersizleştirilir (anında yürürlüğe girme garantisi).
   - **Dinamik Çalışma Ayarları & Kuyruk Yönetimi:** RAG çalışma ayarları (`config:rag:runtime`) Redis üzerinden hot-reload edilir; doküman parçalama ve embedding çıkarma işleri BullMQ kuyrukları (`rag-ingestion-queue`) ile yönetilir. Bull-Board gösterge paneli ile anlık kuyruk izleme sağlanır.

---

## 2. Bütünleşik Varlık İlişkileri Şeması (Entity Relationship Diagram - ERD)

Aşağıdaki şemada, MongoDB üzerindeki temel koleksiyonlar, aralarındaki 1-N ve referans ilişkileri ile Qdrant vektör koleksiyonunun ilişkisi gösterilmiştir:

```mermaid
erDiagram
    ROLE ||--o{ USER : assigns
    USER ||--o{ CONVERSATION : creates
    USER ||--o{ SESSION : has
    USER ||--o{ AUDIT_LOG : triggers
    USER ||--o{ INVITATION_CODE : creates
    USER ||--o{ AI_USAGE_LOG : logs
    CONVERSATION ||--o{ MESSAGE : contains
    PROMPT ||--o{ CONVERSATION : applies_to
    DOCUMENT ||--o{ QDRANT_VECTOR_CHUNK : chunked_into

    ROLE {
        string id PK
        string slug UK "Rol tekil kimligi admin user hr developer"
        string name "Rol Basligi"
        string description "Rol aciklamasi"
        string base_archetype "admin veya user (Yetki tavan arketipi)"
        array permissions "3 parcali izin stringleri: arketip:kategori:eylem"
        boolean is_default "Varsayilan kullanici rolu mu (Yalnizca 1 user rolu)"
        boolean is_system "Sistemik rol mu"
        date created_at "Olusturulma tarihi"
        date updated_at "Guncellenme tarihi"
    }

    USER {
        string id PK
        string email UK "Benzersiz Eposta"
        string password_hash "Sifrelenmis parola hash"
        string first_name "Kullanici Adi"
        string last_name "Kullanici Soyadi"
        string system_role "superadmin admin user (Tek superadmin)"
        array roles "Fonksiyonel departman rolleri hr dev vb"
        object custom_permissions "Kullanici bazli allow ve deny istisnalari"
        boolean is_active "Hesap aktiflik ban durumu"
        date created_at "Olusturulma tarihi"
        date updated_at "Guncellenme tarihi"
    }

    SESSION {
        string id PK
        string token_hash UK "SHA256 Opaque Token Hash"
        string user_id FK "Kullanici ID"
        string ip_address "Istemci IP Adresi"
        string user_agent "Tarayici ve Istemci Bilgisi"
        date expires_at "TTL Otomatik Silinme Tarihi"
        date last_active_at "Son Aktivite Tarihi"
        date created_at "Giris Tarihi"
    }

    AUDIT_LOG {
        string id PK
        string actor_id FK "Islemi yapan kullanici"
        string actor_email "Islemi yapan eposta"
        string action "USER_BANNED ADMIN_ASSIGNED vb"
        string target_id "Etkilenen kullanici veya dokuman"
        string target_type "user document prompt"
        object details "Ek degisiklik detaylari"
        date created_at "Islem zamani"
    }

    PROMPT {
        string id PK
        string title "Prompt Persona Basligi"
        string slug UK "Kurum icinde benzersiz slug"
        string type "system_guardrail persona custom"
        string content "Sistem Direktifi ve Talimat Metni"
        array allowed_roles "Erisim izni olan roller"
        boolean is_active "Kullanimda mi"
        boolean is_default "Varsayilan persona mi"
        int priority "Guardrail oncelik sirasi"
        date created_at "Olusturulma tarihi"
        date updated_at "Guncellenme tarihi"
    }

    CONVERSATION {
        string id PK
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
        string role "user assistant system"
        string content "Mesaj Icerigi"
        date created_at "Gonderilme tarihi"
    }

    DOCUMENT {
        string id PK
        string title "Dokuman Adi ve Basligi"
        string file_name "Orijinal Dosya Adi"
        string file_path "Depolama Dosya Yolu"
        int file_size "Bayt Cinsinden Boyut"
        string mime_type "Dosya tipi"
        string status "pending processing completed failed"
        array allowed_roles "Erisim izni olan roller hr dev all"
        string uploaded_by FK "Yukleyen Kullanici"
        date created_at "Yuklenme tarihi"
        date updated_at "Guncellenme tarihi"
    }

    INVITATION_CODE {
        string id PK
        string code UK "Kriptografik Tekil Davet Kodu"
        array assigned_roles "Katilimda atanacak fonksiyonel roller"
        int max_uses "Maksimum kullanim adedi (Varsayilan 1)"
        int used_count "Kullanilma sayisi"
        date expires_at "Gecerlilik sonu"
        string created_by FK "Ureten Admin ID"
        date created_at "Uretim tarihi"
    }

    AI_USAGE_LOG {
        string id PK
        string user_id FK "Kullanan Kullanici ID"
        string model "Kullanilan Model Adi"
        int prompt_tokens "Giris Token Sayisi"
        int completion_tokens "Uretilen Token Sayisi"
        int total_tokens "Toplam Token"
        int duration_ms "Toplam Yanit Suresi ms"
        int ttft_ms "Ilk Token Gecikmesi ms"
        date created_at "TTL 90 Gunluk Kayit Zamani"
    }

    QDRANT_VECTOR_CHUNK {
        uuid point_id PK "Vektor Nokta ID"
        vector embedding "Gomme Vektor Dizisi"
        string document_id "Kaynak Dokuman ID"
        array allowed_roles "Erisim izni olan roller"
        int chunk_index "Parca Sira Numarasi"
        string text "Orijinal Parca Metni"
        object metadata "Sayfa No Baslik Bolum"
    }

    RAG_SETTINGS {
        string id PK
        string key UK "rag_ingestion_settings"
        int concurrency "Worker eszamanli dokuman kapasitesi"
        int attempts "Tekrar deneme sayisi"
        int backoff_delay_ms "Ustel geri cekilme baslangic suresi ms"
        int chunk_size "Parcalama karakter boyutu"
        int chunk_overlap "Ortusme karakter boyutu"
        int remove_on_complete_count "Tamamlanan is saklama limiti"
        int remove_on_fail_count "Basarisiz is saklama limiti"
        date updated_at "Guncellenme tarihi"
    }
```

---

## 3. Koleksiyon Şemaları ve Veri Sözlüğü (Data Dictionary)

### 3.1. `roles` (Kurumsal Rol ve Yetki Şeması)

Open/Closed prensibine uygun, arketip tabanlı tavan havuzu (`admin` veya `user`) ile korunan dinamik rol tanımları.

| Alan Adı                    | Tip           | Zorunlu? | Varsayılan | İndeks | Açıklama                                                                |
| :-------------------------- | :------------ | :------: | :--------: | :----: | :---------------------------------------------------------------------- |
| `_id`                       | ObjectId      |   Evet   |    auto    |   PK   | Rol benzersiz kimliği                                                   |
| `slug`                      | String (50)   |   Evet   |     -      | UNIQUE | Rol sistemik kodu (`system_admin`, `default_user`, `hr`, `developer`)   |
| `name`                      | String (100)  |   Evet   |     -      |   -    | Rolün görünen adı                                                       |
| `description`               | String        |  Hayır   |    `""`    |   -    | Rol tanımı ve sorumluluk alanı                                          |
| `base_archetype`            | String        |   Evet   |  `'user'`  | Index  | Ana rol arketipi (`'admin'`, `'user'`). Yetki tavanını belirler.        |
| `permissions`               | Array[String] |   Evet   |    `[]`    |   -    | 3 parçalı izinler (`admin:user:ban`, `user:chat:create`)                 |
| `is_default`                | Boolean       |   Evet   |  `false`   | Partial Unique | Yeni kullanıcılar için varsayılan rol mü? (Yalnızca 1 user rolü) |
| `is_system`                 | Boolean       |   Evet   |  `false`   |   -    | Sistemik rol (silinemez)                                                |
| `created_at` / `updated_at` | Date          |   Evet   |    auto    |   -    | Zaman damgaları                                                         |

---

### 3.2. `users` (Kullanıcılar ve RBAC)

Sistemde oturum açan personeller.

| Alan Adı             | Tip               | Zorunlu? | Varsayılan | İndeks                         | Açıklama                                                     |
| :------------------- | :---------------- | :------: | :--------: | :----------------------------- | :----------------------------------------------------------- |
| `_id`                | ObjectId          |   Evet   |    auto    | PK                             | Kullanıcı kimliği                                            |
| `email`              | String            |   Evet   |     -      | UNIQUE                         | E-posta adresi                                               |
| `password_hash`      | String            |   Evet   |     -      | -                              | Şifrelenmiş parola özeti                                     |
| `first_name`         | String            |   Evet   |     -      | -                              | Adı                                                          |
| `last_name`          | String            |   Evet   |     -      | -                              | Soyadı                                                       |
| `system_role`        | String            |   Evet   |  `'user'`  | Partial Unique (`superadmin`)  | `'superadmin'`, `'admin'`, `'user'` (Root Dokunulmazlığı)    |
| `roles`              | Array[String]     |   Evet   |    `[]`    | Index                          | Fonksiyonel departman rolleri (`['hr']`, `['developer']`)    |
| `custom_permissions` | Object            |  Hayır   | `{allow:[], deny:[]}` | -                   | Kullanıcı spesifik yetki ezme (İstisnai allow ve deny)       |
| `is_active`          | Boolean           |   Evet   |   `true`   | Index                          | Hesap aktiflik durumu (Ban kontrolü)                         |

---

### 3.2.1. `sessions` (Kullanıcı Oturumları & Opaque Bearer Tokens - Redis Destekli)

Kullanıcıların aktif oturumlarını ve anlık ban/yetki iptalini yöneten veritabanı oturum koleksiyonu. Performans için token doğrulamaları Redis (`auth:session:${tokenHash}`) üzerinden sub-millisecond yanıtlanır; oturum son aktivite (`last_active_at`) veritabanı yazımları 5 dakikalık zaman aralığına kısıtlanarak (throttling) I/O yükü minimize edilir. Kullanıcı banlandığında veya rol/yetkileri değiştiğinde oturum anahtarları Redis'ten anında temizlenir.

| Alan Adı         | Tip               | Zorunlu? | Varsayılan | İndeks                             | Açıklama                                              |
| :--------------- | :---------------- | :------: | :--------: | :--------------------------------- | :---------------------------------------------------- |
| `_id`            | ObjectId          |   Evet   |    auto    | PK                                 | Oturum benzersiz kimliği                              |
| `token_hash`     | String (64 hex)   |   Evet   |     -      | UNIQUE                             | Opaque Bearer Token'ın SHA-256 kriptografik özeti     |
| `user_id`        | ObjectId          |   Evet   |     -      | Index                              | Oturumu açan kullanıcı kimliği                        |
| `ip_address`     | String            |  Hayır   |     -      | -                                  | Oturum açılan istemci IP adresi                       |
| `user_agent`     | String            |  Hayır   |     -      | -                                  | İstemci tarayıcı ve platform başlığı                  |
| `expires_at`     | Date              |   Evet   |   +7 gün   | TTL Index (`expireAfterSeconds: 0`) | Süresi dolan oturumları MongoDB otomatik siler        |
| `last_active_at` | Date              |   Evet   |    auto    | -                                  | Son HTTP isteği zaman damgası (5 dk throttled)        |
| `created_at`     | Date              |   Evet   |    auto    | -                                  | Oturum başlangıç zamanı                               |

---

### 3.3. `prompts` (Dinamik Prompt Stacking Motoru & Redis Read-Through Önbellekleme)

Promptlar veritabanından her mesajda tekrar tekrar derlenmez; kurumsal güvenlik kuralları ve rol personaları Redis Read-Through önbelleği ile sub-millisecond sürede yanıtlanır.

- **Bileşik İndeks (Compound Index):** `{ type: 1, is_active: 1, priority: 1 }` (Kapsamlı MongoDB taraması engellenir, index-only sorgulama).
- **Redis Önbellek Anahtarları:**
  - Guardrail kuralları: `prompt:guardrail:${rolesKey}`
  - Özel Persona: `prompt:persona:id:${id}`
  - Varsayılan Persona: `prompt:persona:default:${rolesKey}`
- **Anında Geçersizleştirme (Instant Cache Invalidation):** Prompt ekleme (`POST`), güncelleme (`PUT`) veya silme (`DELETE`) işlemlerinde `cacheService.delPattern('prompt:*')` otomatik tetiklenir; sistem genelindeki tüm prompt önbellekleri silinir ve ilk istekte güncel veritabanı içeriği derlenir (Kural 6 & Kural 9 uyumu).

| Alan Adı        | Tip           | Zorunlu? | Varsayılan  | İndeks                                            | Açıklama                                           |
| :-------------- | :------------ | :------: | :---------: | :------------------------------------------------ | :------------------------------------------------- |
| `_id`           | ObjectId      |   Evet   |    auto     | PK                                                | Prompt kimliği                                     |
| `title`         | String (150)  |   Evet   |      -      | -                                                 | Başlık (Örn: "KVKK & Finansal Güvenlik Guardrail") |
| `slug`          | String        |   Evet   |      -      | UNIQUE                                            | Kod içi ve API erişim slug'ı                       |
| `type`          | String        |   Evet   | `'persona'` | Compound (`type` + `is_active` + `priority`)     | `'system_guardrail'`, `'persona'`, `'custom'`      |
| `content`       | String        |   Evet   |      -      | -                                                 | LLM'e enjekte edilecek gerçek talimat              |
| `allowed_roles` | Array[String] |   Evet   |  `['*']`    | Index                                             | Erişebilecek roller (`['*']`, `['hr']` vb.)        |
| `is_active`     | Boolean       |   Evet   |   `true`    | Compound Index parçası                            | Aktiflik anahtarı                                  |
| `is_default`    | Boolean       |   Evet   |   `false`   | -                                                 | Kurum için varsayılan persona mı?                  |
| `priority`      | Number        |   Evet   |     `0`     | Compound Index parçası                            | Guardrail birleştirme öncelik sırası               |

---

### 3.4. `conversations` (Sohbet Oturumları)

| Alan Adı              | Tip           | Zorunlu? | Varsayılan    | İndeks                       | Açıklama                                               |
| :-------------------- | :------------ | :------: | :-----------: | :--------------------------- | :----------------------------------------------------- |
| `_id`                 | ObjectId      |   Evet   |     auto      | PK                           | Oturum kimliği                                         |
| `user_id`             | ObjectId      |  Hayır   |       -       | Compound (`user_id` + `updated_at`) | Oturumu başlatan kullanıcı (Özel veri sahipliği)       |
| `title`               | String (200)  |   Evet   | 'Yeni Sohbet' | -                            | Sohbet başlığı                                         |
| `model`               | String        |   Evet   |       -       | -                            | Oturumda seçilen LLM kimliği (Zorunlu)                 |
| `prompt_id`           | ObjectId      |  Hayır   |    `null`     | -                            | Bağlı olduğu persona ID                                |
| `custom_instructions` | String (2000) |  Hayır   |    `null`     | -                            | Oturuma özel kullanıcı ek talimatı                     |
| `created_at`          | Date          |   Evet   |     auto      | -                            | Oluşturulma tarihi                                     |
| `updated_at`          | Date          |   Evet   |     auto      | Index                        | Son aktivite tarihi                                    |

---

### 3.5. `messages` (Sohbet Mesajları)

| Alan Adı          | Tip      | Zorunlu? | Varsayılan | İndeks                                      | Açıklama                                |
| :---------------- | :------- | :------: | :--------: | :------------------------------------------ | :-------------------------------------- |
| `_id`             | ObjectId |   Evet   |    auto    | PK                                          | Mesaj kimliği                           |
| `conversation_id` | ObjectId |   Evet   |     -      | Compound (`conversation_id` + `created_at`) | Bağlı olduğu oturum                     |
| `role`            | String   |   Evet   |     -      | -                                           | `'user'`, `'assistant'`, `'system'`     |
| `content`         | String   |   Evet   |     -      | -                                           | Mesaj içeriği (Markdown destekli metin) |
| `created_at`      | Date     |   Evet   |    auto    | -                                           | Mesaj zaman damgası                     |

---

### 3.6. `documents` (RAG Bilgi Bankası Üst Verileri & Document ACL)

Kurumsal dokümanların üst verileri, işlenme durumu ve rol bazlı erişim izinleri (Document ACL).

| Alan Adı        | Tip           | Zorunlu? | Varsayılan  | İndeks                | Açıklama                                               |
| :-------------- | :------------ | :------: | :---------: | :-------------------- | :----------------------------------------------------- |
| `_id`           | ObjectId      |   Evet   |    auto     | PK                    | Doküman kimliği                                        |
| `title`         | String (200)  |   Evet   |      -      | -                     | Doküman başlığı                                        |
| `file_name`     | String        |   Evet   |      -      | -                     | Orijinal dosya adı (UUID ile güvenli saklanır)         |
| `file_path`     | String        |   Evet   |      -      | -                     | Sunucu yerel depolama dosya yolu (`uploads/rag/`)      |
| `file_size`     | Number        |   Evet   |      -      | -                     | Bayt cinsinden dosya boyutu (Maks 25MB)                |
| `mime_type`     | String        |   Evet   |      -      | -                     | `application/pdf`, `text/plain`, `text/markdown` vb.   |
| `status`        | String        |   Evet   | `'pending'` | Index                 | `'pending'`, `'processing'`, `'completed'`, `'failed'` |
| `chunk_count`   | Number        |   Evet   |     `0`     | -                     | Qdrant'a yazılan vektör parçacığı adedi                |
| `allowed_roles` | Array[String] |   Evet   |  `['*']`    | Compound (`allowed_roles` + `created_at`) | Belgeyi sorgulayabilecek roller (`['*']`, `['hr']` vb.)|
| `uploaded_by`   | ObjectId      |  Hayır   |      -      | Index                                     | Dokümanı yükleyen kullanıcı kimliği (`users._id`)      |
| `error_message` | String        |  Hayır   |   `null`    | -                                         | İşleme başarısız olursa yakalanan hata mesajı          |
| `created_at`    | Date          |   Evet   |    auto     | Compound Index parçası                    | Yüklenme zaman damgası                                 |
| `updated_at`    | Date          |   Evet   |    auto     | -                     | Son güncelleme zaman damgası                           |

---

### 3.7. Qdrant Vektör Koleksiyonu Şeması (`rag_documents_vectors`)

Qdrant üzerinde her vektör kaydı bir `Point` nesnesidir ve Zero-Context-Leakage prensibiyle filtrelenir:

- **Point ID:** UUIDv4 formatında benzersiz parça kimliği.
- **Vector:** Model embedding çıktısı (örn: 1536 veya 768 float değerleri).
- **Payload (Filtrelenebilir Meta Veri):**
  ```json
  {
    "document_id": "66f91a2b8e3a...",
    "allowed_roles": ["hr", "finance"],
    "chunk_index": 4,
    "text": "Kurumumuz bünyesinde veri güvenliği ve yıllık izin devir şartları...",
    "metadata": {
      "filename": "ik_el_kitabi_2026.pdf",
      "page_number": 12,
      "chunk_char_count": 450
    }
  }
  ```

---

### 3.8. `rag_configs` (Dinamik BullMQ & Ingestion Ayarları - Hot-Reload)

Sistem yöneticisinin backend'i yeniden başlatmadan BullMQ iş kuyruğu parametrelerini anlık güncelleyebilmesini sağlayan ayar tablosu (`key: 'rag_ingestion_settings'`).

| Alan Adı                   | Tip      | Zorunlu? | Varsayılan | İndeks | Açıklama                                                  |
| :------------------------- | :------- | :------: | :--------: | :----: | :-------------------------------------------------------- |
| `_id`                      | ObjectId |   Evet   |    auto    |   PK   | Kayıt kimliği                                             |
| `key`                      | String   |   Evet   |    auto    | UNIQUE | Tekil ayar anahtarı (`'rag_ingestion_settings'`)          |
| `concurrency`              | Number   |   Evet   |    `2`     |   -    | BullMQ Worker anlık eşzamanlı doküman işleme kapasitesi   |
| `attempts`                 | Number   |   Evet   |    `3`     |   -    | Başarısız olan doküman indeksleme işlerinin tekrar sayısı |
| `backoff_delay_ms`         | Number   |   Evet   |   `2000`   |   -    | Üstel geri çekilme (exponential backoff) başlangıç süresi |
| `chunk_size`               | Number   |   Evet   |   `800`    |   -    | Metin parçalama (chunking) karakter hedef boyutu          |
| `remove_on_complete_count` | Number   |   Evet   |   `1000`   |   -    | Başarıyla tamamlanan işlerin Redis'te saklanma limiti     |
| `remove_on_fail_count`     | Number   |   Evet   |   `5000`   |   -    | Hata alan işlerin Redis'te saklanma limiti                |
| `updated_at`               | Date     |   Evet   |    auto    |   -    | Son güncelleme tarihi                                     |

---

## 4. İş Mantığı ve Çalışma Akış Şemaları (Workflows & Sequences)

### 4.1. Akış 1: LLM Mesaj Gönderimi & Dinamik Prompt Stacking Akışı

Kullanıcı bir mesaj gönderdiğinde sistemin yanıt üretme, güvenlik guardrail'lerini uygulama, RAG grounding ve veritabanına yazma sırası:

```mermaid
sequenceDiagram
    autonumber
    actor User as Kullanıcı (UI)
    participant Gateway as Express Gateway (AuthMiddleware & PolicyEngine)
    participant Redis as Redis Cache (auth & prompt)
    participant ChatCtrl as ChatController
    participant ChatSvc as ChatService
    participant RagSvc as RagService (Qdrant & Zero-Context-Leakage)
    participant PromptFacade as PromptService (Facade)
    participant AIProvider as AIProviderService (Vercel AI SDK)
    participant DB as MongoDB (Message / Conversation)

    User->>Gateway: POST /api/chat (Bearer Token, conversationId, messages, model, enableRag)
    Note over Gateway, Redis: Opaque Bearer Token Redis'ten <0.5ms sürede doğrulanır
    Gateway->>Redis: GET auth:session:{tokenHash}
    alt Oturum Redis'te mevcut değilse
        Gateway->>DB: findSessionWithUser (Fallback) & Redis'e yaz
    end
    Gateway->>ChatCtrl: handleChat(req, res)
    ChatCtrl->>ChatSvc: streamChat(dto, userContext)

    rect rgb(255, 240, 240)
    Note over ChatSvc, ChatSvc: OWASP LLM01 & LLM06: Prompt Injection & Jailbreak Denetimi
    ChatSvc->>ChatSvc: PromptGuard.assertSafe(lastUserMessage & customInstructions)
    alt Saldırı / Direktif Ezme / Sistem İfşası Tespit Edilirse
        ChatSvc-->>User: 400 Bad Request (SECURITY_VIOLATION) & Akış Durdurulur
    end
    end

    alt enableRag: true ise
        Note over ChatSvc, RagSvc: Semantik Bilgi Bankası Araması
        ChatSvc->>RagSvc: queryKnowledge({ query: lastUserMessage, limit: 5 }, userContext)
        RagSvc->>RagSvc: Qdrant Rol Filtreli Benzerlik Araması (Zero-Context-Leakage)
        RagSvc-->>ChatSvc: Doğrulanmış Alıntılar (Citations)
    end

    rect rgb(240, 245, 255)
    Note over ChatSvc, PromptFacade: Çok Katmanlı Dinamik Prompt Derleme & XML İzolasyonu (Prompt Stacking)
    ChatSvc->>PromptFacade: buildSystemPrompt({ prompt_id, custom_instructions, userRoles, ragContext })
    PromptFacade->>Redis: GET prompt:guardrail:{roles} & prompt:persona:{id}
    alt Cache Miss (Redis'te Yoksa)
        PromptFacade->>DB: lean() ile Mongo'dan oku & Redis'e set() et (24h TTL)
    end
    PromptFacade-->>ChatSvc: Katman 0 (Güvenlik Protokolü) + Katman 1 (Guardrails) + Katman 2 (Persona) + Katman 3 (<user_custom_instructions>) + Katman 4 (<untrusted_rag_context>)
    end

    ChatSvc->>AIProvider: streamText({ model, system: finalPrompt, messages })
    AIProvider-->>User: Server-Sent Events (SSE) Token Akışı Başlar...
    ChatCtrl-->>User: StreamData ile rag-citations annotasyonu iletilir

    AIProvider-->>ChatSvc: onFinish (Tam Asistan Metni)
    opt conversationId mevcutsa
        ChatSvc->>DB: User Mesajını Kaydet (role: 'user')
        ChatSvc->>DB: Assistant Yanıtını Kaydet (role: 'assistant')
        ChatSvc->>DB: Conversation.updated_at güncelle
    end
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
    participant AIEmbed as Embedding Servisi (Vercel AI SDK)
    participant Qdrant as Qdrant Vektör DB (REST)

    Admin->>API: POST /api/rag/upload (Multipart File + title + allowed_roles)
    API->>API: Disk Depolamaya UUID ile kaydet & MIME/Kota kontrolü (Maks 25MB)
    API->>DB: Document kaydı oluştur (status: 'pending', allowed_roles)
    API->>Queue: Yeni iş ekle (Job: { documentId, filePath, originalFileName, mimeType })
    API-->>Admin: 202 Accepted (Document ID & Durum: PENDING)

    rect rgb(245, 255, 245)
    Note over Queue, Worker: Asenkron Arka Plan İşlemi (Concurrency Control)
    Queue->>Worker: Job tetiklenir (rag-ingestion-queue)
    Worker->>DB: Status -> 'processing' olarak güncelle
    Worker->>Worker: Metin Çıkarıcı (PdfExtractor / PlainTextExtractor / Registry)
    Worker->>Worker: Recursive Character Splitting (800 char chunk + 150 overlap)
    Worker->>AIEmbed: generateEmbeddings(chunks) -> Vercel AI SDK
    AIEmbed-->>Worker: Cosine normalizasyonlu float dizileri döner
    Worker->>Qdrant: Batch Upsert Points (Payload: { document_id, allowed_roles, text, metadata })
    Qdrant-->>Worker: Upsert OK
    Worker->>DB: Status -> 'completed', chunk_count -> N güncelle
    end
```

---

### 4.3. Akış 3: RAG Destekli Chat Arama ve Yanıt Üretimi (Retrieval Flow & Grounding)

Kullanıcı RAG aramasını aktif ederek (`enableRag: true`) bir soru sorduğunda Qdrant, Zero-Context-Leakage ve LLM entegrasyonu:

```mermaid
flowchart TD
    A["Kullanıcı Mesajı (POST /api/chat)"] --> B["Chat Controller / Service"]
    B --> C{"enableRag Aktif mi?"}
    C -- Hayır --> D["Standart LLM İstek Akışına Devam Et"]
    C -- Evet --> E["Son Kullanıcı Mesajı için Embedding Üret (Vercel AI SDK)"]
    E --> F["Qdrant Similarity Search Sorgusu (searchWithRoleFilter)"]

    subgraph Qdrant_RBAC_Filtreleme ["Qdrant Zero-Context-Leakage Güvenlik Filtresi"]
        F --> G["Filtre: userRoles VEYA allowed_roles='*' (Superadmin bypass)"]
        G --> H["Kosinüs Benzerliği Hesapla - Top-K (Score >= Threshold)"]
    end

    H --> I["Alakalı Parçaları Alıntıya (Citation) Dönüştür & Doküman Başlıklarını Eşle"]
    I --> J["Prompt Stacking Motoru: 4. Katman RAG Grounding Context Enjeksiyonu"]

    subgraph Prompt_Derleme ["Nihai Sistem İstemi (Prompt Stacking)"]
        J --> K["1. Katman: Kurumsal Guardrail Güvenlik Kuralları"]
        K --> L["2. Katman: Rol / Persona Uzmanlık Talimatı"]
        L --> M["3. Katman: Kullanıcı Özel Ek Talimatı"]
        M --> N["4. Katman: Kurumsal Bilgi Bankası ve Belge Alıntıları"]
    end

    N --> O["LLM Sağlayıcıya İlet (streamText)"]
    O --> P["Vercel AI SDK DataStream ile Streaming Yanıt + rag-citations Annotasyonu"]
```

---

### 4.4. Akış 4: Kurumsal RBAC, Policy Engine & Zero-Context-Leakage Karar Akışı

Gelen her isteğin yetkisiz departman veya kullanıcı verilerine erişmesini engelleyen güvenlik akışı:

```mermaid
flowchart TD
    Req["Gelen HTTP İsteği"] --> MW1["AuthMiddleware: Opaque Bearer Token Doğrulaması"]
    MW1 --> MW2["Aktif Session & User Çözümleme"]
    MW2 --> BanCheck{"Hesap Aktif mi? (is_active)"}
    BanCheck -- Hayır --> 403Ban["403 FORBIDDEN (Hesap Askıya Alındı)"]
    BanCheck -- Evet --> PolicyCheck{"PolicyEngine: İzin Denetimi"}

    subgraph Policy_Engine ["PolicyEngine.can(user, requiredPermission)"]
        PolicyCheck --> SuperCheck{"system_role == 'superadmin'?"}
        SuperCheck -- Evet --> Granted["İZİN VERİLDİ (Koşulsuz)"]
        SuperCheck -- Hayır --> DenyOverride{"direct_permissions.deny listesinde var mı?"}
        DenyOverride -- Evet --> Denied["REDDEDİLDİ (Explicit Deny)"]
        DenyOverride -- Hayır --> RoleCheck{"Rol İzinleri Havuzunda (Union) var mı?"}
        RoleCheck -- Evet --> Granted
        RoleCheck -- Hayır --> AllowOverride{"direct_permissions.allow listesinde var mı?"}
        AllowOverride -- Evet --> Granted
        AllowOverride -- Hayır --> Denied
    end

    Granted --> ModAction["İlgili Modül İş Mantığı Çalıştırılır"]

    subgraph Zero_Context_Leakage ["RAG Bilgi Bankası Zero-Context-Leakage Filtresi"]
        ModAction --> QdrantSearch["Qdrant searchWithRoleFilter"]
        QdrantSearch --> RoleACL{"Kullanıcı Superadmin mi?"}
        RoleACL -- Evet --> AllDocs["Tüm Doküman Vektörlerinde Ara"]
    end
```

---

## 5. Modüler Monolit Facade ve İletişim Standartları

[AGENTS.md](../../AGENTS.md) 3. kuralı uyarınca: **Modüller birbirlerinin veritabanı modellerini doğrudan import edemez.** Modüller arası tüm etkileşim yalnızca modülün kökündeki `index.ts` üzerinden yürütülür.

### Modül İletişim Arayüzleri Tablosu

| İsteyen Modül | Hedef Modül | İzin Verilen Facade Metodu / Event                                              | Gerekçe / Kullanım Amacı                                       |
| :------------ | :---------- | :------------------------------------------------------------------------------ | :------------------------------------------------------------- |
| `chat`        | `prompt`    | `promptService.buildSystemPrompt({ prompt_id, custom_instructions, userRoles, ragContext })` | Çok katmanlı (4 katman) promptu anlık derlemek                 |
| `chat`        | `auth`      | `authMiddleware` / `IUser`                                                      | Kullanıcının aktifliğini ve rol/yetki matrisini denetlemek     |
| `chat`        | `ai`        | `streamText({ model, messages, system })` / `getModel(selectedModel)`           | LLM çıkarımını başlatmak                                       |
| `chat`        | `rag`       | `ragService.queryKnowledge(queryInput, userContext)`                            | RAG destekli sohbette benzer doküman parçalarını getirmek      |
| `rag`         | `ai`        | `embeddingService.generateQueryEmbedding(text)` / `generateEmbeddings(texts)`   | Chunk ve sorgular için embedding vektörleri üretmek            |
| `rag`         | `prompt`    | N/A (Tamamen izole)                                                             | -                                                              |

---

## 6. Özet ve Uygulama Kontrol Listesi

- [x] **MongoDB Şemaları:** `Tenant`, `User`, `Prompt`, `Conversation`, `Message`, `Document` ilişkileri ve indeksleri tanımlandı.
- [x] **Dinamik Prompt Stacking:** 3 katmanlı derleme sırası (Guardrail $\rightarrow$ Persona $\rightarrow$ Custom) şemalaştırıldı.
- [x] **Qdrant Vektör İzolasyonu:** Vektör payload şeması ve `tenant_id` filtresi netleştirildi.
- [x] **RAG Pipeline:** BullMQ eşzamanlı çalışma, Redis ve SSE ilerleme akışları bağlandı.
- [x] **Modüler Monolit İzolasyonu:** Modüller arası Facade sözlüğü ve cross-DB import yasağı dokümante edildi.
