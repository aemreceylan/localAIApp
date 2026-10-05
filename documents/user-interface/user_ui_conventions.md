# USER INTERFACE FRONTEND VE BİLEŞEN GELİŞTİRME STANDARTLARI

> **DOKÜMAN TİPİ:** Alt Proje Kodlama ve UI Standartları (`apps/user-interface`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_Chotonack AI — Gateway & Knowledge Base_)  
> **İlişkili Dokümanlar:** [Tasarım Sistemi](../common/design_system_and_tokens.md), [Canlı Prototip](../stitch_design_preview.html)  

---

## 1. Temel Prensipler ve Teknoloji Seçimi

1. **Teknoloji Yığını:** React 18+, TypeScript, Tailwind CSS, Vite.
2. **Sıfır Dış UI Bağımlılığı (Zero/Low Dependency):**
   - Radix UI, MUI, HeadlessUI gibi harici UI kütüphaneleri **kesinlikle kurulamaz ve kullanılamaz**.
   - Tüm bileşenler (Sağ Çekmece, Modallar, Popover'lar, Açılır Menüler, Sekmeler) projenin kendi kod tabanında (`apps/user-interface/src/components/ui/`) saf React + Tailwind ile yazılmalıdır.
3. **Akıcı ve Reaktif Sohbet (Streaming First):**
   - LLM yanıtları Server-Sent Events (SSE) ile gelirken ekranda kasma veya titreme yapmamalı; `requestAnimationFrame` veya optimize edilmiş state güncellemeleri kullanılmalıdır.

---

## 2. Kullanıcı UI Bileşen Standartları

### 2.1. Yüzen Prompt Dock'u (Floating Input Dock)

- **Tasarım:** Sayfanın altına sabitlenmiş, hafif bulanık zemin (`backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg`).
- **Girdi Alanı (Textarea):**
  - İçeriğe göre otomatik yükselen (min 44px, max 200px) saf React kancası (`useAutoResizeTextarea`).
  - `Enter` tuşu mesajı gönderir, `Shift + Enter` yeni satır ekler.
- **Ek Elemanlar:**
  - Sol tarafta dosya yükleme `+` butonu ve Persona şablon seçici popover'ı.
  - Sağ tarafta canlı yaklaşık token sayacı ve gönderim oku butonu.

### 2.2. Mesaj Balonları ve Markdown Renderer

- **Kullanıcı Mesajı:** Sağa yaslı, markanın ana renginde (`bg-brand-600 text-white rounded-2xl rounded-tr-sm`).
- **Asistan Mesajı:** Sola yaslı, açık kart zemininde (`bg-slate-50 dark:bg-slate-800/60 rounded-2xl rounded-tl-sm border border-slate-200/60 dark:border-slate-700/60`).
- **Kod Blokları:**
  - JetBrains Mono yazı tipi ile arka plan `bg-slate-950 text-slate-100`.
  - Üst barda dil etiketi (*"typescript"*, *"python"*) ve tek tıkla kopyalama butonu (*"Kopyalandı!"* geri bildirimi).

### 2.3. Görünüm Ayarları Modalı (Derin Ayar İlkesi)

- Renk paletleri chat arayüzünün tepesinde kalabalık yapmaz; sol alttaki profil çarkından veya üst ayarlar butonundan açılan modalda toplanır.
- Sistem teması (`prefers-color-scheme`) varsayılandır; kullanıcı dilerse Aydınlık veya Karanlık seçebilir.
- 4 swatch paleti (Nexus Indigo, Emerald Sentinel, Obsidian Minimal, Cyber Ocean) seçildiğinde `html[data-palette="..."]` özniteliği anında güncellenir.

---

## 3. Sayfa ve Dizin Düzeni (`apps/user-interface/src/`)

```
src/
├── assets/                  # İkonlar ve görseller
├── components/
│   ├── chat/                # ChatStream, MessageItem, PromptDock, SideBySideView
│   ├── drawer/              # RAGInspectorDrawer, CitationCard, ChunkPreview
│   ├── layout/              # UserLayout, UserSidebar, TopNavbar
│   ├── modal/               # AppearanceSettingsModal, ShareChatModal
│   └── ui/                  # Button, Input, Modal, Badge, Popover, Tooltip
├── hooks/                   # useChatStream, useTheme, useAutoResizeTextarea
├── services/                # chatApi.ts, promptApi.ts, ragApi.ts
└── types/                   # ChatMessage, Conversation, Citation tipleri
```
