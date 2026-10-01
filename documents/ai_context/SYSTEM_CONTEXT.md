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
    │   └── architecture.md                    # SAD v1.2.0, Modüler Monolit, RLS, Prompt Engine, RAG
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
| **`backend`** | Node.js (v20+ LTS), Express, Mongoose, Qdrant, BullMQ, Vercel AI SDK, Vitest | Çekirdek mimari, Prompt Stacking, Subpath imports (`#*`), RLS altyapısı ve Zod DTO'lar hazır. SonarQube temizliği yapıldı. | RAG ingestion worker entegrasyonu, Ollama model yönetim API'si. |
| **`admin-interface`** | React 18+, TypeScript, Tailwind CSS, Vite | Mimari şartname ve ekran hiyerarşisi dökümante edildi; iskelet kurulacak. | Vite projesinin başlatılması, "Nexus Precision" token entegrasyonu, model ve RBAC yönetim sayfaları. |
| **`user-interface`** | React 18+, TypeScript, Tailwind CSS, Vite | Mimari şartname, chat akışları ve RAG çekmece spesifikasyonu hazır; iskelet kurulacak. | Vite projesinin başlatılması, SSE chat stream kancası, yüzen prompt dock'u ve sağ çekmece. |

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
