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
│   └── backend/                               # Node.js + Express + TypeScript (Clean Architecture)
├── documents/
│   ├── README.md                              # Master Bilgi Bankası Kataloğu
│   ├── stitch_design_preview.html             # Canlı Onaylanmış Tasarım Prototipi
│   ├── human/                                 # İnsan okumasına yönelik şartnameler & SAD/PRD
│   └── ai_context/                            # AI oturumları için optimize edilmiş kurallar
```

---

## 3. Onaylanmış Temel Kararlar (Kullanıcı Tarafından Kesinleşti)

1. **Görsel Dil & Tasarım:**
   - Onaylanan estetik: "Nexus Precision" (Modern B2B SaaS, temiz grid çizgileri, slate kenarlıklar).
   - [stitch_design_preview.html](file:///c:/Users/ahmet/Desktop/YAZILIM/localAIApp/documents/stitch_design_preview.html) dosyasındaki yerleşim, bileşenler ve etkileşimler referanstır.
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
   - İş alanlarına (Bounded Contexts) göre ayrılmış bağımsız modüller (`auth`, `tenant`, `chat`, `rag`, `ollama`) ve ortak `shared/` katmanı.
   - Katı veri izolasyonu (modüller arası doğrudan DB sorgusu yasaktır) ve her modülün kendi public API (`index.ts`) üzerinden haberleşmesi.
   - Multi-Tenancy: MongoDB ve Qdrant üzerinde `tenant_id` bazlı Row-Level Security (RLS).
