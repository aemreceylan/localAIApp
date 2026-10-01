# Proje Bilgi Bankası (Knowledge Base Index)

**Kurumsal LLM & Veri Yönetim Platformu** (*NexusAI Gateway & Knowledge Base*) dökümantasyon havuzuna hoş geldiniz.

Bu bilgi bankası, **1 Ortak Çatı + 3 Bağımsız Alt Proje** (`backend`, `admin-interface`, `user-interface`) içeren Monorepo yapısına göre düzenlenmiştir. Hem **yazılım geliştiriciler ve ürün yöneticileri (İnsan Okuması)** hem de **Yapay Zeka Oturumları (AI Agents)** için projenin tek ve güncel doğruluk kaynağı (Single Source of Truth) olarak yapılandırılmıştır.

---

## 📁 Bilgi Bankası Dizin Yapısı

```
documents/
├── README.md                                  # Bu master katalog ve kılavuz
├── openapi.json                               # Canlı OpenAPI 3.0 API Dokümanı (JSON)
├── stitch_design_preview.html                 # Canlı etkileşimli tasarım prototipi (User Chat & Admin)
│
├── common/                                    # 🌐 1. TÜM PROJE İÇİN ORTAK DÖKÜMANLAR
│   ├── prd.md                                 # Ürün Gereksinimleri Belgesi (PRD v2.1.0)
│   ├── design_system_and_tokens.md            # "Nexus Precision" Tasarım Sistemi, Renk Paletleri & CSS Token'ları
│   └── data_and_business_workflows.md         # Bütünleşik MongoDB ERD, Qdrant Şeması & Sequence Akışları
│
├── backend/                                   # ⚙️ 2. BACKEND ÖZEL DÖKÜMANTASYONU (apps/backend)
│   └── architecture.md                        # Modüler Monolit, Bounded Contexts, RLS, Prompt Engine & RAG
│
├── admin-interface/                           # 🛡️ 3. ADMIN INTERFACE ÖZEL DÖKÜMANTASYONU (apps/admin-interface)
│   ├── architecture_and_screens.md            # Admin Paneli Mimarisi, Sol Menü & Sayfa Hiyerarşisi
│   ├── model_and_tenant_management.md         # LLM Sağlayıcıları, Hardcoded Model Yasağı, Lokal İndirme, RBAC
│   └── admin_ui_conventions.md                # Saf React Veri Tabloları, Modallar, Admin State Kuralları
│
├── user-interface/                            # 💬 4. USER INTERFACE ÖZEL DÖKÜMANTASYONU (apps/user-interface)
│   ├── architecture_and_chat_flows.md         # Chat Arayüzü Mimarisi, Streaming, Side-by-Side Arena
│   ├── rag_drawer_and_prompt_ui.md            # Sağ RAG Çekmecesi, Dipnotlar, Dinamik Persona/Prompt Seçimi
│   └── user_ui_conventions.md                 # Chat Bileşenleri, Yüzen Dock, Markdown Renderer
│
└── ai_context/                                # 🤖 5. AI AJANLARI İÇİN HIZLI BAĞLAM (TOKEN-EFFICIENT KURALLAR)
    ├── SYSTEM_CONTEXT.md                      # Genel Proje Özeti & 3 Alt Projenin Durum Panosu
    ├── COMMON_GUIDELINES.md                   # AI Çalışma İlkeleri, 5-Adım Anti-Loop, SonarQube & Test Kuralları
    ├── BACKEND_RULES.md                       # Backend Özel AI Kuralları (Subpath imports, Facade, RLS)
    ├── ADMIN_INTERFACE_RULES.md               # Admin UI Özel AI Kuralları (Saf React/Tailwind, Tablolar, RBAC)
    └── USER_INTERFACE_RULES.md                # User UI Özel AI Kuralları (Chat UI, Streaming, RAG Çekmecesi)
```

---

## 📌 Hızlı Bağlantılar ve Navigasyon Tablosu

| Doküman | Kapsam | Hedef Kitle | Açıklama |
| :--- | :--- | :--- | :--- |
| **[OpenAPI 3.0 Spesifikasyonu](openapi.json)** | Ortak / API | Tümü | Koddan otomatik üretilen güncel REST API uç noktaları ve veri modelleri. (Swagger UI: `/api/docs`) |
| **[Canlı Tasarım Prototipi](stitch_design_preview.html)** | Ortak / UI | Tümü | Tarayıcıda doğrudan test edilebilen User Chat, Side-by-Side ve Admin Dashboard prototipi. |
| **[Ortak PRD](common/prd.md)** | Ortak / İş | İnsan & AI | v2.1.0 iş analizi, kullanıcı rolleri, RAG gereksinimleri ve MoSCoW MVP fazlandırması. |
| **[Tasarım Sistemi & Token'lar](common/design_system_and_tokens.md)** | Ortak / UI | İnsan & AI | "Nexus Precision" 4 hazır renk paleti, tipografi ölçeği ve CSS değişkenleri. |
| **[Veritabanı & İş Akış Şemaları](common/data_and_business_workflows.md)** | Ortak / Veri | İnsan & AI | Bütünleşik MongoDB ERD, Qdrant payload şeması, Prompt Stacking ve RAG akışları. |
| **[Backend Mimarisi](backend/architecture.md)** | `apps/backend` | İnsan & AI | v1.2.0 Modüler Monolit, Bounded Contexts, Dinamik Prompt Stacking, Mongoose RLS, Qdrant ve BullMQ. |
| **[Admin Paneli Mimarisi](admin-interface/architecture_and_screens.md)** | `apps/admin-interface` | İnsan & AI | Admin Dashboard ekranları, KPI kartları, GPU yükü, telemetri ve navigasyon hiyerarşisi. |
| **[Admin Model & RBAC](admin-interface/model_and_tenant_management.md)** | `apps/admin-interface` | İnsan & AI | LLM Sağlayıcıları, Hardcoded Model Yasağı (Kural 5), Lokal Model İndirme Yöneticisi ve Esnek RBAC. |
| **[Admin UI Standartları](admin-interface/admin_ui_conventions.md)** | `apps/admin-interface` | İnsan & AI | Saf React + Tailwind veri tabloları, modallar, drawer'lar ve zero-dependency standartları. |
| **[User Chat Mimarisi](user-interface/architecture_and_chat_flows.md)** | `apps/user-interface` | İnsan & AI | Kullanıcı Chat deneyimi, SSE streaming, Side-by-Side kıyaslama ve sohbet geçmişi. |
| **[User RAG Çekmecesi & Prompt](user-interface/rag_drawer_and_prompt_ui.md)** | `apps/user-interface` | İnsan & AI | Sağ RAG referans çekmecesi, `[1]` dipnot rozetleri, chunk önizleme ve persona seçimi. |
| **[User UI Standartları](user-interface/user_ui_conventions.md)** | `apps/user-interface` | İnsan & AI | Chat bileşenleri, yüzen prompt dock'u, markdown renderer ve görünüm ayarları modalı. |
| **[AI Sistem Bağlamı](ai_context/SYSTEM_CONTEXT.md)** | Monorepo | AI Ajanları | AI ajanlarının oturum başında okuması gereken özet ve durum raporu. |
| **[AI Ortak İlkeler](ai_context/COMMON_GUIDELINES.md)** | Monorepo | AI Ajanları | Token verimliliği, 5-deneme anti-loop kuralı, SonarQube ve yaşayan dökümantasyon kuralları. |
| **[AI Backend Kuralları](ai_context/BACKEND_RULES.md)** | `apps/backend` | AI Ajanları | Backend Modüler Monolit, katı veri izolasyonu, RLS ve Node.js subpath imports (`#*`). |
| **[AI Admin UI Kuralları](ai_context/ADMIN_INTERFACE_RULES.md)** | `apps/admin-interface` | AI Ajanları | Admin arayüzü saf React/Tailwind, tablo, modal ve model yönetim kuralları. |
| **[AI User UI Kuralları](ai_context/USER_INTERFACE_RULES.md)** | `apps/user-interface` | AI Ajanları | Kullanıcı sohbet arayüzü saf React/Tailwind, SSE streaming ve RAG çekmecesi kuralları. |

---

## 💡 Bilgi Bankasını Güncel Tutma İlkesi
Bu projedeki her mimari karar, yeni eklenen ekran veya değiştirilen iş kuralı öncelikle bu dökümantasyon havuzuna işlenmelidir. Gelecekte projeye dahil olacak geliştiriciler ve AI asistanları daima bu belgeleri referans alacaktır.
