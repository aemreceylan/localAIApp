# SYSTEM_CONTEXT.md — AI Knowledge Base & Multi-App Monorepo State

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (AI Agents)  
> **AMAC:** Oturum başladığında tüm monorepo ekosistemini anında tanımak, 3 alt projenin (`backend`, `admin-interface`, `user-interface`) ayrımını kavramak ve tekrarlayan soruları önlemek.

---

## 1. Proje Kimliği ve Ekosistem Özeti

- **Platform:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_).
- **Dağıtım Modeli:** Self-hosted / On-prem sunucularda çalışan, uzaktan erişilebilir, yerel (Ollama, vLLM) ve bulut LLM'leri orkestre eden kurumsal RAG platformu.
- **Mimari Tip:** 1 Ortak Çatı + 3 Bağımsız Alt Proje içeren Monorepo yapısı.

---

## 2. Monorepo Dizin ve Alt Proje Haritası

```
localAIApp/
├── AGENTS.md                                  # AI Ajanları Merkezi Trafik Yönlendiricisi
│
├── apps/                                      # 📦 ÜÇ BAĞIMSIZ ALT PROJE
│   ├── backend/                               # Node.js + Express + TypeScript (Modüler Monolit)
│   │   └── src/modules/
│   │       ├── auth/                          # Kimlik doğrulama, kullanıcılar, ban ve oturum yönetimi
│   │       ├── role/                          # Dinamik RBAC, arketip tavanı ve yetkilendirme motoru
│   │       ├── chat/                          # LLM sohbet oturumları ve SSE streaming
│   │       ├── prompt/                        # Dinamik prompt stacking ve persona motoru
│   │       ├── rag/                           # Qdrant vektör arama ve ingestion
│   │       └── ai/                            # Yerel/bulut model yönetimi
│   ├── admin-interface/                       # React + TypeScript + Tailwind (Yönetici Paneli)
│   └── user-interface/                        # React + TypeScript + Tailwind (Kullanıcı Chat & RAG)
│
└── documents/                                 # 📚 BİLGİ BANKASI VE ŞARTNAMELER
    ├── README.md                              # Ana Dökümantasyon Portalı
    ├── openapi.json                           # Canlı API Sözleşmesi (Backend üretir, UI'lar tüketir)
    ├── stitch_design_preview.html             # Canlı Onaylanmış Tasarım Prototipi
    │
    ├── common/                                # 🌐 TÜM PROJE İÇİN ORTAK DÖKÜMANLAR
    │   ├── prd.md                             # Ürün Vizyonu, Roller & PRD v2.1.0
    │   ├── design_system_and_tokens.md        # "Nexus Precision" Tasarım Sistemi & CSS Token'ları
    │   └── data_and_business_workflows.md     # Bütünleşik MongoDB ERD, Qdrant Şeması & Akışlar
    │
    ├── backend/                               # ⚙️ BACKEND ÖZEL DÖKÜMANTASYONU
    │   └── architecture.md                    # SAD v1.2.0, Modüler Monolit, RBAC, Prompt Engine, RAG
    │
    ├── admin-interface/                       # 🛡️ ADMIN INTERFACE ÖZEL DÖKÜMANTASYONU
    │   ├── architecture_and_screens.md        # Admin Paneli Mimarisi & Sayfa Hiyerarşisi
    │   ├── model_and_tenant_management.md     # Model Tanımlama, Lokal İndirme, RBAC
    │   └── admin_ui_conventions.md            # Saf React Tablolar, Modallar, Admin State
    │
    ├── user-interface/                        # 💬 USER INTERFACE ÖZEL DÖKÜMANTASYONU
    │   ├── architecture_and_chat_flows.md     # Chat Mimarisi, Streaming, Side-by-Side Arena
    │   ├── rag_drawer_and_prompt_ui.md        # Sağ RAG Çekmecesi, Dipnotlar, Persona UI
    │   └── user_ui_conventions.md             # Chat Bileşenleri, Yüzen Dock, Markdown
    │
    └── ai_context/                            # 🤖 AI AJANLARI HIZLI BAĞLAM KURALLARI
        ├── SYSTEM_CONTEXT.md                  # Bu genel sistem özeti
        ├── COMMON_GUIDELINES.md               # Ortak Çalışma & Anti-Loop Prensipleri
        ├── BACKEND_RULES.md                   # Backend Modüler Monolit & RLS Kuralları
        ├── ADMIN_INTERFACE_RULES.md           # Admin UI Saf React & RBAC Kuralları
        └── USER_INTERFACE_RULES.md            # User UI Saf React & Chat Kuralları
```

---

## 3. Alt Projelerin Anlık Durumu

| Alt Proje | Teknoloji Yığını | Mevcut Durum | Sonraki Odak / Yapılacaklar |
| :--- | :--- | :--- | :--- |
| **`backend`** | Node.js (v20+ LTS), Express, Mongoose, Qdrant, BullMQ, Vercel AI SDK, Vitest | **Çekirdek Mimari, RBAC, RAG Pipeline & Kurumsal Güvenlik Sertleştirmesi Tamamlandı:** Prompt Stacking (4 Katman), Subpath imports (`#*`), Zod DTO'lar, Opaque Bearer Token (`sessions`), Super Admin ilk kurulum kapısı, Dinamik Rol Modülü (`modules/role`), 3 Katmanlı Yetkilendirme (PolicyEngine), **RAG Veri Modeli & Repository Katmanı** (`DocumentModel`, `rag.dto.ts`, `rag.repository.ts`), **Qdrant Vektör Adaptörü & Zero-Context-Leakage Rol İzolasyonu** (`qdrant.adapter.ts`), **Metin Çıkarıcılar & Chunking Engine** (`PlainTextExtractor`, `PdfExtractor`, `ExtractorRegistry`, `RecursiveChunker`), **Vercel AI SDK Embedding Servisi** (`embedding.service.ts`), **BullMQ Redis Ingestion Queue & Worker** (`rag.queue.ts`, `rag.worker.ts`), **Dinamik BullMQ Ayarları & Hot-Reload** (`rag-config.service.ts`), **Bull-Board Express Paneli** (`/admin/queues`), **Multer Güvenli Dosya Yükleme & REST API** (`/api/rag/*`, `/api/admin/rag/*`), **RAG Chat Grounding & Citations DataStream Entegrasyonu** (`chat.service.ts`, `StreamData`, `x-nexusai-citations-count`), ve **Kapsamlı Güvenlik Sertleştirmesi (AppSec):** BOLA/IDOR sohbet izolasyonu, `/api/chat` ve `/api/prompts` zorunlu kimlik doğrulama & RBAC koruması, Bull-Board kuyruk paneli yetkilendirme guard'ı, Multer kesin uzantı-MIME eşleme, hassas başlık maskeleme ve kayan pencere (Sliding Window) rate limiting. Toplam **19 test dosyası**. | Frontend Entegrasyonları: `admin-interface` (RAG doküman/kuyruk yönetimi) ve `user-interface` (RAG çekmecesi ve alıntı kartları). |
| **`admin-interface`** | React 18+, TypeScript, Tailwind CSS, Vite | Mimari şartname ve ekran hiyerarşisi dökümante edildi; iskelet kurulacak. | Vite projesinin başlatılması, "Nexus Precision" token entegrasyonu, model ve RBAC yönetim sayfaları. |
| **`user-interface`** | React 18+, TypeScript, Tailwind CSS, Vite | **Tamamlandı & Canlı:** Vite + React + Tailwind + Native ESM Subpath Imports (`#*`) iskeleti kuruldu. Sıfır dış UI bağımlılığı ile saf bileşenler, katlanabilir/sürüklenebilir Sidebar, canlı SSE streaming, Super Admin İlk Kurulum Ekranı (`SetupSuperAdminView`), Kurumsal Giriş Ekranı (`LoginView`), `AuthProvider` & `useAuth`, Sidebar gerçek profil & anlık oturum kapatma (Logout), ve kullanıcıya özel geçmiş sohbet oturumları çalışmaktadır. **Backend RAG Entegrasyonu Tamamlandı:** Vercel AI SDK DataStream protokolü ile anlık SSE token akışı ve `rag-citations` ayrıştırması (`chatService.ts`), `useChatStream` RAG ve doküman filtreleme kancası, `CitationCard` (kosinüs benzerlik rozetleri, chunk/sayfa detayları, güvenli ReDoS korumalı kesit vurgulama), `RAGDrawer` (çift sekmeli görünüm: Aktif Alıntılar & Canlı Bilgi Bankası Doküman Listesi), `MessageBubble` onaylı alıntı referans çipleri, `PromptDock` (canlı PDF/belge yükleme/ingestion, RAG Açık/Kapalı anahtarı). Üretim derlemesi (`tsc && vite build`) 0 hata ile doğrulandı. | Model kıyaslama arena entegrasyonu ve mobil layout optimizasyonları. |


---

## 4. Onaylanmış Temel İlkeler (Tüm Monorepo İçin Geçerli)

1. **Görsel Dil & Tasarım:** "Nexus Precision" (Modern B2B SaaS, temiz grid çizgileri, slate kenarlıklar). Referans prototip: `documents/stitch_design_preview.html`.
2. **Tema Davranışı:** Varsayılan `prefers-color-scheme` sistem temasıdır (Fallback: Aydınlık). Renk paletleri Görünüm Ayarları Modalı içinde derindedir.
3. **Sıfır Dış UI Bağımlılığı (Zero-Dependency):** Her iki frontend (`admin-interface`, `user-interface`) için de Radix, MUI, AntD, AG-Grid vb. kütüphaneler yasaktır. Saf React + Tailwind kullanılacaktır.
4. **Backend Modüler Monolit (Modular Monolith):** Bounded Contexts, katı veri izolasyonu (cross-DB sorgu yasağı) ve Facade (`index.ts`) iletişimi.
5. **Admin Model Yönetimi (Kural 5):** Sistemde hiçbir yerde (kod, DB şeması, .env) hardcoded model bulunamaz. Modelleri admin tanımlar; kullanıcı model seçmek zorundadır.
6. **Dinamik Prompt Stacking:** Kurumsal guardrail, persona ve kullanıcı ek talimatı anlık olarak birleştirilir; prompt güncellemeleri anında tüm aktif oturumlara yansır.
7. **Standart Subpath Imports (#*):** Backend modül erişimlerinde Node.js native ESM `#modules/*`, `#config/*`, `#shared/*` zorunludur.
8. **Canlı OpenAPI 3.0 Dokümantasyonu:** Zod DTO'lar ile Swagger UI (`/api/docs`) ve master dosya (`documents/openapi.json`) canlı tutulur.
9. **Eşzamanlı Güvenlik Denetimi (Security-by-Design & Continuous Security Review):** Geliştirilen veya güncellenen her kod parçası (API uç noktaları, servisler, repository'ler, frontend bileşenleri/formları) eşzamanlı güvenlik testinden (BOLA/IDOR, kimlik doğrulama/yetkilendirme guard'ları, header spoofing önleme, katı girdi doğrulama, dosya yükleme kontrolü, hassas veri maskeleme, rate limiting) geçirilir ve güvenliği sağlanmadan kod teslim edilmez.

