# SYSTEM_CONTEXT.md — AI Knowledge Base & Multi-App Monorepo State

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (AI Agents)  
> **AMAC:** Oturum başladığında tüm monorepo ekosistemini anında tanımak, 3 alt projenin (`backend`, `admin-interface`, `user-interface`) ayrımını kavramak ve tekrarlayan soruları önlemek.

---

## 1. Proje Kimliği ve Ekosistem Özeti

- **Platform:** Kurumsal LLM & Veri Yönetim Platformu (_Chotonack AI — Gateway & Knowledge Base_).
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
| **`backend`** | Node.js (v20+ LTS), Express, Mongoose, Qdrant, BullMQ, Vercel AI SDK, Vitest | **Tüm Çekirdek Altyapı, RBAC, Onboarding, Telemetri & Model Yönetimi Tamamlandı:** Prompt Stacking (4 Katman) + Redis Read-Through önbellekleme (`prompt:*`), Subpath imports (`#*`), Zod DTO'lar, Opaque Bearer + HttpOnly SameSite=Strict Cookie (`nexus_session`, `admin_token`), Anlık Ban/Revocation, Dinamik RBAC (`modules/role`: granular yetkilendirme, `admin:user:assign_role` ve `admin:user:override`), RAG Pipeline (Qdrant, Chunking, BullMQ Ingestion), **Kullanıcı Kayıt & Onay Süreci** (`status: pending_approval`, `/api/auth/register`, `/api/auth/users/pending`, approve/reject), **Kriptografik Davetiyeler** (`nx_inv_*`, `/api/auth/invitations`), **Telemetri & Metrik Modülü** (`modules/telemetry`: Redis dakika sepetleri, p50/p95/p99 gecikme, MongoDB 90 günlük TTL `ai_usage_logs`, CPU, RAM, Event Loop Lag, Ollama VRAM), **Model Yönetim API'si** (`modules/ai`: SSE akışlı model indirme `POST /api/admin/models/pull`, %85 disk doluluk güvenlik denetimi, varsayılan model belirleme, silme). **Kural 5 Tam Uyum (Hardcoded model sıfırlandı)**. 149 backend testi (22 test dosyasında) 100% başarılı. | Frontend Entegrasyonları: admin-interface ve user-interface. |
| **`admin-interface`** | React 19, TypeScript, Tailwind CSS v4, React Compiler, React Router v7, TanStack Query v5, Vite 7 | **Tamamlandı & Canlı (`http://localhost:5174`):** React 19 + React Compiler (otomatik memoization) + Vite + Tailwind CSS v4 (CSS-first `@theme`) iskeleti kuruldu. Subpath imports (`#*`) yapılandırıldı. **Sıfır Dış UI Bağımlılığı kuralına tam uyumlu saf bileşenler:** `Button`, `Input`, `Badge`, `Card`, `Modal` (ESC/backdrop dismiss, focus management), `Table` (sıralanabilir, duyarlı, boş durumlu), `Progress`, `IdleTimeoutModal` (30 dakikalık boşta kalma ve 2 dk kala geri sayım güvenlik modalı). **Tüm Ekranlar Geliştirildi:** Dashboard (canlı telemetri, CPU/RAM/VRAM, HTTP metrikleri, LLM token analitiği), Model Yönetimi (Ollama SSE indirme çubuğu, varsayılan model, silme), Personel & Rol Yönetimi (kullanıcı listesi, ban/unban, rol düzenleme), Onay Havuzu (bekleyen başvuruları rolleriyle onaylama veya gerekçeli reddetme), Davetiye Yönetimi (kriptografik süreli ve kotalı kod üretme ve kopyalama), Güvenli Giriş / İlk Kurulum Sayfası (`LoginPage`). Üretim derlemesi (`npm run build`) 0 hata ile doğrulandı. | Sonraki adım: RAG doküman yönetimi ve model yetki filtreleri. |
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
10. **README.md ve .env.example Sürekli Senkronizasyonu:** Yeni ortam değişkeni, altyapı servisi, port veya mimari yetenek eklendiğinde/değiştirildiğinde; kök dizindeki `README.md` ve ilgili alt projelerin `.env.example` dosyaları eşzamanlı ve proaktif olarak güncellenir.


