# SYSTEM_CONTEXT.md — AI Knowledge Base & Project State

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (AI Agents)  
> **AMAC:** Oturum başladığında projeyi anında tanımak, mimari kararları kavramak ve tekrarlayan soruları önlemek.

---

## 1. Proje Özeti
- **Platform:** Kurumsal LLM & Veri Yönetim Platformu (NexusAI Gateway & Knowledge Base).
- **Hedef:** Self-hosted / On-prem sunucularda çalışan, uzaktan erişilebilir, yerel (Ollama, vLLM) ve bulut LLM'leri orkestre eden RAG platformu.
- **Aktif Faz:** UI/UX Mimarisi, Tasarım Sistemi ve Frontend İskelet Kurulumu (Faz 1 / MVP).

---

## 2. Monorepo Dizin Haritası

```
localAIApp/
├── AGENTS.md                                  # AI Ajanları giriş noktası
├── apps/
│   ├── user-interface/                        # React + TypeScript + Tailwind (Kullanıcı Chat & RAG)
│   ├── admin-interface/                       # React + TypeScript + Tailwind (Yönetici Paneli & Modeller)
│   └── backend/                               # Node.js + Express + TypeScript (Modüler Monolit / Modular Monolith)
├── documents/
│   ├── README.md                              # Master Bilgi Bankası Kataloğu
│   ├── openapi.json                           # Otomatik üretilen OpenAPI 3.0 API Dokümanı (JSON)
│   ├── stitch_design_preview.html             # Canlı Onaylanmış Tasarım Prototipi
│   ├── human/                                 # İnsan okumasına yönelik şartnameler & SAD/PRD
│   └── ai_context/                            # AI oturumları için optimize edilmiş kurallar
```

---

## 3. Onaylanmış Temel Kararlar (Kullanıcı Tarafından Kesinleşti)

1. **Görsel Dil & Tasarım:**
   - Onaylanan estetik: "Nexus Precision" (Modern B2B SaaS, temiz grid çizgileri, slate kenarlıklar).
   - [stitch_design_preview.html](../stitch_design_preview.html) dosyasındaki yerleşim, bileşenler ve etkileşimler referanstır.
2. **Tema Davranışı:**
   - Varsayılan: `prefers-color-scheme` sistem teması.
   - Fallback: Aydınlık (Light) Mod.
   - Renk Paletleri (Indigo, Emerald, Obsidian, Ocean) doğrudan chat ekranında DEĞİL, Görünüm Ayarları Modalı içinde derinde bulunur.
3. **Sol Sidebar:**
   - Hem kullanıcı hem admin arayüzünde daralabilir sol sidebar onaylanmıştır.
4. **React & Sıfır Bağımlılık (Zero-Dependency):**
   - Dış paket bağımlılığı en aza indirilecektir.
   - Radix, HeadlessUI veya harici UI kütüphaneleri kurulmayacaktır; bileşenler saf React + Tailwind ile `components/ui/` içinde yazılacaktır.
5. **Backend Modüler Monolit (Modular Monolith) Mimarisi:**
   - İş alanlarına (Bounded Contexts) göre ayrılmış bağımsız modüller (`auth`, `tenant`, `chat`, `prompt`, `rag`, `ai`) ve ortak `shared/` katmanı.
   - Katı veri izolasyonu (modüller arası doğrudan DB sorgusu yasaktır) ve her modülün kendi public API (`index.ts`) üzerinden haberleşmesi.
   - Multi-Tenancy: MongoDB ve Qdrant üzerinde `tenant_id` bazlı Row-Level Security (RLS).
6. **Geliştirici Çalışma Prensipleri & Anti-Loop Protokolü:**
   - Adım adım, parça parça ve kullanıcı ile istişare ederek ilerleme prensibi, en fazla 5 başarısız denemeden sonra durup kullanıcıya danışılması (anti-loop kuralı), token verimliliği, pragmatik mantık odaklı testler ve yaşayan çift odaklı (insan/AI) dökümantasyon kuralları ([DEVELOPMENT_GUIDELINES.md](DEVELOPMENT_GUIDELINES.md)) onaylanmıştır.
7. **Admin Model Yönetimi:**
   - Şema veya kod seviyesinde varsayılan model sabitlenemez.
   - İzin verilen modeller ve varsayılan model seçimi Admin yetkisindedir; kullanıcı oturum açarken veya anlık sohbette model seçmek zorundadır.
8. **Çok Katmanlı Dinamik Prompt Mimarisi (Prompt Stacking):**
   - Prompt'lar `Conversation` içinde statik dondurulmaz; ayrı bir `src/modules/prompt` modülünde yönetilir.
   - Her mesaj gönderiminde kurumsal guardrail, seçilen persona ve kullanıcı ek talimatı anlık olarak birleştirilir; prompt güncellemeleri anında tüm aktif sohbetlere yansır.
9. **Canlı OpenAPI 3.0 Dokümantasyonu & Swagger UI:**
   - Zod şemaları (`@asteasolutions/zod-to-openapi`) üzerinden otomatik üretilen tip güvenli REST API spesifikasyonu.
   - Web üzerinden `/api/docs` (Swagger UI) ve `/api/docs.json` adresinden interaktif sunulur; ayrıca master döküman olarak `documents/openapi.json` dosyasına otomatik kaydedilir.
10. **Bütünleşik Veritabanı Mimarisi & İş Akış Şemaları (Data & Business Workflows):**
   - MongoDB koleksiyonları (`Tenant`, `User`, `Prompt`, `Conversation`, `Message`, `Document`), Qdrant vektör payload şeması, Dinamik Prompt Stacking akışı ve RAG Ingestion/Retrieval pipeline'ı Mermaid ERD ve sequence diyagramları ile [data_and_business_workflows.md](../human/data_and_business_workflows.md) belgesinde standartlaştırılmıştır.
11. **SonarQube Destekli Kod Kalitesi & Güvenlik Denetimi:**
   - Geliştirme süreçlerinde SonarQube MCP entegrasyonu aktif olarak kullanılır; kodlar "Clean as You Code (CaYC)" prensibi, varsayılan "Sonar way" kalite kapısı, sıfır kritik güvenlik zafiyeti (OWASP Top 10, Security Hotspots) ve düşük bilişsel karmaşıklık hedefleriyle geliştirilir.
12. **TypeScript Path Aliases & Modül İçe Aktarım Standardı:**
   - Kod tabanında kırılgan ve derin göreceli import'lar (`../../`) yerine `tsconfig.json` path alias'ları (`@/config/*`, `@/modules/*`, `@/shared/*`, `@/*`) zorunlu kılınmıştır. Dosya düzeni veya dizin hiyerarşisi güncellendiğinde tüm import yollarının kırılmasını önler. Derleme sürecinde `tsc && node scripts/resolve-aliases.js` ile native Node ESM uyumluluğu sağlanır.




