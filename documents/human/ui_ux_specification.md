# UI/UX Şartnamesi ve Ekran Mimarisi

**Proje:** Kurumsal LLM & Veri Yönetim Platformu (*NexusAI Gateway & Knowledge Base*)  
**Rol:** AI Product Designer & Frontend Lead  
**Durum:** Kullanıcı Tarafından Onaylandı  
**İnteraktif Prototip:** [stitch_design_preview.html](file:///c:/Users/ahmet/Desktop/YAZILIM/localAIApp/documents/stitch_design_preview.html)

---

## 1. Tasarım Felsefesi ve İlkeler
1. **Modern Enterprise B2B SaaS Estetiği:** Sade, yüksek okunabilirlikli, göz yormayan ve teknik kullanıcılara derin kontrol sunan bir arayüz dili ("Nexus Precision").
2. **Odak Noktası (Focus-Driven):** Chat ekranında gereksiz buton kalabalığı önlenir. Renk paleti seçimi gibi derin ayarlar doğrudan arayüzün tepesinde değil, "Görünüm Ayarları Modalı" içinde yer alır.
3. **Şeffaf Kaynak Takibi (Grounded RAG):** Yapay zekanın ürettiği her metin parçasının kurumsal bilgi bankasındaki dayanağı metin içi rozetlerle (`[1]`, `[2]`) gösterilir.
4. **Çift Dünyalı Mimari:**
   - **Kullanıcı Dünyası (User Interface):** Minimalist sohbet, anlık doküman analizi, yan yana model kıyaslama ve kaynak inceleme.
   - **Yönetici Dünyası (Admin Dashboard):** Donanım telemetrisi (GPU yükü, gecikmeler), model indirme yöneticisi, BullMQ iş kuyrukları ve audit logları.

---

## 2. Ekran Mimarileri ve Detayları

### 2.1. Kullanıcı Arayüzü (User Chat)
* **Sol Katlanabilir Kenar Çubuğu (Sidebar):**
  * Genişlik: `288px` (Genişletilmiş), `64px` (Daraltılmış).
  * Yeni Sohbet (⌘N) aksiyonu.
  * Departman etiketli sabit sohbetler (*Hukuk, Finans, Ar-Ge*).
  * Kronolojik gruplama (*Bugün, Geçmiş 7 Gün*).
  * Kullanıcı kimliği ve Kullanıcı Token Limiti Barı (*Örn: 42,500 / 100,000*).
* **Merkez Sohbet Akışı:**
  * Üst Çubuk: Model seçici (*Llama 3.3 Yerel / GPT-4o Bulut*), aktif Bilgi Bankası göstergesi, Yan Yana Kıyasla butonu, Sohbet Paylaş linki ve Sağ Çekmece butonu.
  * Mesaj Balonları: Kullanıcı mesajları sağa yaslı; asistan yanıtları sola yaslı, akışlı (streaming) yanıt, markdown başlıklar, tek tıkla kopyalanabilir syntax-highlighted kod blokları.
  * **RAG Dipnot Rozetleri:** Tıklanabilir `[1] Belge_Adi.pdf (s. 14)` rozetleri tıklandığında sağ çekmeceyi hedefe odaklayarak açar.
* **Alt Yüzen Prompt Dock'u:**
  * Sohbet içine anlık doküman (PDF, TXT, DOCX) yükleme butonu (+).
  * Şablon Kütüphanesi popover'ı (*"Sözleşme Analiz Et", "Kodu İncele"*).
  * Otomatik genişleyen çok satırlı textarea, token tahmin sayacı ve gönder butonu.
* **Sağ RAG Doküman Önizleme Çekmecesi (Inspector Drawer):**
  * Genişlik: `350px` - `420px`.
  * Benzerlik Skoru (Örn: `%94 Eşleşme`), Chunk ID, Sayfa Numarası ve Qdrant Vektör Skoru.
  * Orijinal dokümandan çıkarılan metin kesiti (aranan terimler sarı vurgulu).
  * Orijinal dokümanı tam ekran açma veya indirme butonu.

---

### 2.2. Yan Yana Çoklu Model Kıyaslama (Side-by-Side Arena)
* **PRD 3.1 & 6.2 Faz 2 Gereksinimi:**
  * Kullanıcı tek bir prompt girer.
  * Ekran dinamik olarak iki eşit dikey sütuna bölünür.
  * **Sol Sütun (Yerel Model - Ollama/vLLM):** Llama 3.3 70B Instruct, yerel GPU bellek kullanımı, ilk token süresi (TTFT 142ms) ve token/saniye hızı.
  * **Sağ Sütun (Bulut Model - API):** GPT-4o / Claude 3.5 Sonnet, yanıt akışı, gecikme süresi (320ms) ve API token maliyeti.

---

### 2.3. Yönetici Kontrol Paneli (Admin Dashboard)
* **Sol Sabit Menü:**
  * *Genel Bakış, LLM & Yerel Modeller, Bilgi Bankası (RAG), Kullanıcılar & Esnek RBAC, Denetim Kayıtları (Audit Logs), Sistem Ayarları*.
  * Alt durum: *Ollama Engine (Bağlı)*, *vLLM Cluster (Bağlı)*.
* **Üst Durum & Telemetri Çubuğu:**
  * Sistem Sağlığı: `Uptime: %99.98`, `NVIDIA A100 GPU: %42 Yük`.
* **4 Ana KPI Kartı:**
  1. Toplam Token Kullanımı (248.4M - ↑ %14.2)
  2. Aktif Yerel Modeller (12 / 16)
  3. Bekleyen RAG İndekslemeleri (3 Doküman - BullMQ)
  4. Aktif Kullanıcılar (1,420 toplam, 84 çevrim içi)
* **Grafikler ve Metrikler:**
  * 24 saatlik GPU ve Token Tüketim Dağılım Grafiği.
  * Canlı Model İlk Token Gecikmesi (TTFT) tablosu.
* **PRD 4.2 Lokal Model İndirme Yöneticisi Tablosu:**
  * Model Adı, Disk Boyutu, Parametre, Sağlayıcı, Durum Rozeti.
  * İndirme İlerleme Barı (%68, 42 MB/s aktarım hızı).
  * Aksiyonlar: *Yapılandır, Duraklat, İptal Et, Durdur*.

---

### 2.4. Görünüm & Tema Ayarları Modalı (Derin Ayar)
* Kullanıcının talebi doğrultusunda renk paletleri ana ekranda yer almaz; sol alttaki profil çarkından veya üst bardaki ayarlar butonundan açılan modalda toplanmıştır.
* **Tema Seçimi:** Sistem Varsayılanı (Otomatik), Aydınlık, Karanlık.
* **Renk Paleti Seçimi:** 4 swatch kartı (Nexus Indigo, Emerald Sentinel, Obsidian Minimal, Cyber Ocean).
