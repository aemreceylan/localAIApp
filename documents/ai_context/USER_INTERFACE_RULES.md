# USER_INTERFACE_RULES.md — AI Agent User Interface Kuralları

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (AI Agents)  
> **KAPSAM:** Alt Proje `apps/user-interface`  
> **AMAÇ:** Son kullanıcı arayüzü (`apps/user-interface`) üzerinde kod üretirken uyulması zorunlu olan saf React + Tailwind kuralları, sıfır dış bağımlılık prensibi, SSE streaming akışı, RAG referans çekmecesi ve sohbet bileşen standartları.

---

## 1. Kesin Kısıtlamalar (Non-Negotiable Constraints)

1. **Sıfır / Minimum Dış UI Bağımlılığı (Zero External UI Dependencies):**
   - Radix UI, MUI, HeadlessUI gibi harici paketler **kesinlikle kurulamaz**.
   - Çekmece (Drawer), Popover, Modal, Dropdown gibi bileşenler projenin kendi kod tabanında (`src/components/ui/`) saf React 18+ ve Tailwind CSS ile yazılacaktır.
2. **Streaming-First Deneyim:**
   - LLM yanıtları Server-Sent Events (SSE) ile anlık olarak tüketilmeli (`fetch` + `ReadableStream` veya `EventSource`).
   - Her gelen token balona anında eklenmeli; React re-render'ları optimize edilerek ekran titremesi önlenmelidir.
3. **Model Seçimi Zorunluluğu (Kural 5):**
   - Sohbet başlatılmadan önce kullanıcı Admin tarafından izin verilen modeller listesinden (`allowed_models`) bir model seçmek zorundadır. Kodda sabit model tanımlanamaz.
4. **Tasarım Standartları & Renk Paletleri:**
   - [Nexus Precision](../common/design_system_and_tokens.md) standartları geçerlidir.
   - Renk paletleri ana ekranda değil, sol alttaki profil çarkından açılan "Görünüm Ayarları Modalı" içinde yer alır. Sistem teması varsayılandır.

---

## 2. Kullanıcı UI Bileşen Standartları

### 2.1. Sol Katlanabilir Kenar Çubuğu (Sidebar)
- Genişletilmiş: `288px`, Daraltılmış: `64px`.
- `⌘N` kısayolu veya üstteki buton ile Yeni Sohbet başlatma.
- Sabitlenmiş departman sohbetleri ve kronolojik geçmiş gruplama (*Bugün, Son 7 Gün*).
- Alt alanda Kullanıcı Token Kotası göstergesi barı (*Örn: 42,500 / 100,000*).

### 2.2. Merkez Sohbet Akışı
- **Üst Çubuk:** Model seçici dropdown'u, aktif Bilgi Bankası etiketi, "Kıyasla" butonu, "Paylaş" bağlantısı ve Sağ Çekmece açma butonu.
- **Mesaj Balonları:**
  - Kullanıcı mesajı sağa yaslı (`bg-brand-600 text-white`).
  - Asistan yanıtı sola yaslı (`bg-slate-50 dark:bg-slate-800/60`).
  - Markdown başlıklar, listeler ve JetBrains Mono ile biçimlendirilmiş tek tıkla kopyalanabilir kod blokları.
- **RAG Dipnot Rozetleri:**
  - Metin içindeki `[1] Belge.pdf (s. 14)` rozetlerine tıklandığında sağ çekmeceyi açıp ilgili kaynağa odaklanma.

### 2.3. Alt Yüzen Prompt Dock'u
- Sayfanın altına yapışık, yarı saydam ve yuvarlak köşeli (`backdrop-blur-md rounded-2xl shadow-lg`).
- `+` butonu ile anlık doküman ekleme (PDF, TXT, DOCX).
- Şablon butonu ile açılan popover'dan Admin tarafından tanımlanmış Persona/Prompt seçimi.
- Otomatik yükselen çok satırlı textarea (`Enter` ile gönder, `Shift+Enter` ile yeni satır).
- Canlı yaklaşık token sayacı ve gönderim butonu.

### 2.4. Sağ RAG Referans Çekmecesi (Drawer)
- Genişlik: `350px` - `420px`.
- Ekranı kaplamadan sohbet alanını daraltarak sağdan açılır.
- Qdrant benzerlik skoru (% eşleşme rozeti), Chunk ID, sayfa numarası ve aranan terimlerin sarı vurgulandığı metin kesiti.
- Orijinal dokümanı açma veya indirme butonu.

### 2.5. Yan Yana Model Kıyaslama (Side-by-Side Arena)
- Ekranı iki eşit dikey sütuna bölme (Sol: Model A, Sağ: Model B).
- Tek bir girdi ile her iki modele eşzamanlı istek atma ve yanıtları yan yana canlı akıtma.

---

## 3. Dizin ve Dosya Standartları (`apps/user-interface/src/`)

```
src/
├── components/
│   ├── chat/         # ChatStream.tsx, MessageBubble.tsx, PromptDock.tsx, SideBySide.tsx
│   ├── drawer/       # RAGDrawer.tsx, CitationCard.tsx
│   ├── layout/       # UserLayout.tsx, Sidebar.tsx, Navbar.tsx
│   ├── modal/        # AppearanceModal.tsx, ShareModal.tsx
│   └── ui/           # Button.tsx, Input.tsx, Modal.tsx, Drawer.tsx, Popover.tsx
├── hooks/            # useChatStream.ts, useTheme.ts, useAutoResize.ts
├── services/         # chatApi.ts, promptApi.ts, ragApi.ts
└── types/            # chat.types.ts
```
