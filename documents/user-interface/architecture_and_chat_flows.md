# USER INTERFACE (KULLANICI ARAYÜZÜ) MİMARİSİ VE SOHBET AKIŞLARI

> **DOKÜMAN TİPİ:** Alt Proje Özel Mimari & UI Şartnamesi (`apps/user-interface`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_)  
> **İlişkili Dokümanlar:** [Ortak PRD v2.1.0](../common/prd.md), [Tasarım Sistemi](../common/design_system_and_tokens.md), [Canlı Tasarım Prototipi](../stitch_design_preview.html)  
> **Rol:** AI Lead Product Designer & Frontend Architect  

---

## 1. Giriş ve Kullanıcı Deneyimi Vizyonu

`apps/user-interface` alt projesi, son kullanıcıların yerel ve bulut LLM'lerle kesintisiz, hızlı ve odaklanabilir bir deneyimle etkileşime girmesini sağlar.

Arayüzün temel tasarım ilkeleri:
- **Odaklanabilir Tasarım:** Sohbet merkezli, dikkat dağıtmayan minimalist yerleşim.
- **Şeffaf Kaynak Doğrulaması:** RAG ile gelen yanıtların kurumsal belgelerdeki dayanaklarının anında incelenebilmesi.
- **Model Seçim Esnekliği:** Admin tarafından izin verilen modeller arasında kolay geçiş veya yan yana kıyaslama.

---

## 2. Sayfa ve Ekran Mimarisi

Kullanıcı arayüzü 3 ana bölgeden oluşur:

```
User Chat Layout
├── 1. Sol Katlanabilir Kenar Çubuğu (Sidebar - 288px / 64px)
│   ├── Yeni Sohbet Butonu (⌘N)
│   ├── Sabitlenmiş Departman Sohbetleri (Hukuk, Finans, Ar-Ge)
│   ├── Kronolojik Sohbet Geçmişi (Bugün, Son 7 Gün, Geçen Ay)
│   └── Kullanıcı Profili & Token Kotası Barı (Örn: 42,500 / 100,000)
│
├── 2. Merkez Sohbet Akışı
│   ├── Üst Çubuk (Model Seçici, RAG Durumu, Kıyasla, Paylaş, Çekmece Aç)
│   ├── Mesaj Akışı (Kullanıcı Sağa, Asistan Sola Yaslı; Streaming & Markdown)
│   └── Alt Yüzen Prompt Dock'u (Dosya Ekle +, Persona Popover, Textarea, Gönder)
│
└── 3. Sağ RAG Referans Çekmecesi (Drawer - 350px / 420px)
    ├── Benzerlik Skoru & Chunk ID
    ├── Belge Önizleme & Aranan Terim Vurgusu
    └── Orijinal Belgeyi İndirme / Görüntüleme
```

---

## 3. Sohbet Yaşam Döngüsü ve İletişim Akışları

### 3.1. Mesaj Gönderimi ve Server-Sent Events (SSE) Akışı

1. Kullanıcı mesajı yazdığında veya şablondan seçtiğinde `POST /api/chat` isteği atılır.
2. Gelen yanıtta HTTP connection açık tutulur ve SSE stream'i başlar.
3. Kullanıcı arayüzünde asistan mesaj balonu açılarak gelen her token anında metne eklenir (kelime bazlı animasyon).
4. Akış bittiğinde (`[DONE]`) mesaj tamamlandı olarak işaretlenir ve yerel durum güncellenir.

### 3.2. Yan Yana Çoklu Model Karşılaştırma (Side-by-Side Arena)

- **PRD 3.1 & 6.2 Faz 2 Özelliği:**
  - Kullanıcı üst çubuktan "Kıyasla" butonuna tıklar.
  - Merkez alan iki eşit dikey sütuna bölünür:
    - **Sol Sütun (Model A - Örn: Yerel Llama 3.3):** Yerel GPU bellek kullanımı, ilk token süresi (TTFT 142ms) ve token/saniye hızı.
    - **Sağ Sütun (Model B - Örn: Bulut GPT-4o):** Bulut yanıt akışı, yanıt süresi ve yaklaşık maliyet.
  - Kullanıcı tek bir prompt girer; her iki model aynı anda yanıt üretir.

### 3.3. Sohbet Yönetimi ve Paylaşım

- **Sohbet Düzenleme & Dallandırma:** Gönderilen önceki bir kullanıcı mesajı düzenlendiğinde o noktadan yeni bir yanıt dalı başlatılır.
- **Paylaşılabilir Bağlantılar (Shareable Links):** Bir sohbet şirket içindeki diğer kullanıcılarla salt okunur bağlantı ile paylaşılabilir.
- **Dışa Aktarma:** Sohbet geçmişi Markdown veya PDF formatında dışarı aktarılabilir.
