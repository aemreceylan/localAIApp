# ADMIN INTERFACE (YÖNETİCİ PANELİ) MİMARİSİ VE EKRAN SPESİFİKASYONU

> **DOKÜMAN TİPİ:** Alt Proje Özel Mimari & UI Şartnamesi (`apps/admin-interface`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_)  
> **İlişkili Dokümanlar:** [Ortak PRD v2.1.0](../common/prd.md), [Tasarım Sistemi](../common/design_system_and_tokens.md), [Canlı Tasarım Prototipi](../stitch_design_preview.html)  
> **Rol:** AI Lead Product Designer & Admin Systems Architect  

---

## 1. Giriş ve Amaç

Bu doküman, `apps/admin-interface` alt projesinin sayfa mimarisini, navigasyon yapısını, yönetici paneli bileşenlerini ve telemetri ekranlarını tanımlar. 

Yönetici Paneli, platformun teknik altyapısını, donanım kaynaklarını, modelleri, bilgi bankasını (RAG) ve kullanıcı yetkilendirmesini tek bir merkezden yönetmek üzere tasarlanmıştır.

---

## 2. Navigasyon ve Ekran Hiyerarşisi

Yönetici arayüzü, sol sabit menü ve ana içerik alanından oluşan modern bir B2B SaaS dashboard mimarisine sahiptir:

```
Admin Dashboard Layout
├── Sol Sabit Menü (Sidebar)
│   ├── Logo & Kurum Başlığı
│   ├── Genel Bakış (Dashboard Overview)
│   ├── LLM & Yerel Modeller (Model Management)
│   ├── Bilgi Bankası / RAG (Knowledge Base & Ingestion)
│   ├── Kullanıcılar & Esnek RBAC (Users & Access Control)
│   ├── Denetim Kayıtları (Audit & Telemetry Logs)
│   ├── Sistem Ayarları (Settings & Environment)
│   └── Alt Durum Göstergesi (Ollama / vLLM Engine Status)
└── Ana İçerik Alanı
    ├── Üst Durum & Telemetri Çubuğu (System Health & GPU Load)
    └── İlgili Sayfa İçeriği
```

---

## 3. Ekran Detayları ve Fonksiyonel Kapsam

### 3.1. Genel Bakış (Dashboard Overview)

- **Üst Durum & Telemetri Çubuğu:**
  - Sistem Sağlığı: `Uptime: %99.98`, `NVIDIA A100 GPU: %42 Yük`.
- **4 Ana KPI Kartı:**
  1. **Toplam Token Kullanımı:** Dönemsel tüketim rakamı ve değişim yüzdesi (örn: `248.4M - ↑ %14.2`).
  2. **Aktif Yerel Modeller:** Kullanıma hazır / indirilmiş model oranı (örn: `12 / 16`).
  3. **Bekleyen RAG İndekslemeleri:** BullMQ kuyruğunda bekleyen veya işlenen doküman sayısı.
  4. **Aktif Kullanıcılar:** Toplam kayıtlı ve anlık çevrim içi kullanıcı sayısı.
- **Grafikler ve Metrikler:**
  - 24 saatlik GPU yükü ve Token tüketim dağılım grafiği.
  - Canlı model İlk Token Gecikmesi (Time to First Token - TTFT) tablosu.

### 3.2. LLM & Yerel Model Yönetimi Ekranı

- **Model Listesi & İzin Yönetimi:**
  - Kurum genelinde aktif/pasif olan yerel ve bulut LLM'lerin listesi.
  - Hangi kiracıların veya rollerin hangi modelleri görebileceğinin yapılandırılması.
  - Varsayılan önerilen modelin seçilmesi (Kural 5 uyarınca kodda hardcode model yoktur; seçim admin panelindedir).
- **Lokal Model İndirme Yöneticisi Tablosu:**
  - Model Adı, Disk Boyutu, Parametre Boyutu (örn: 8B, 70B), Sağlayıcı (Ollama/vLLM), Durum Rozeti.
  - Anlık indirme ilerleme barı (% oran, MB/s aktarım hızı).
  - Aksiyon butonları: *Yapılandır, Duraklat, İptal Et, Durdur, Sil*.

### 3.3. Bilgi Bankası (RAG) & Doküman Yönetimi Ekranı

- Kurumsal dokümanların ve veri havuzlarının taranması, yüklenmesi ve Qdrant koleksiyonlarına bağlanması.
- İndeksleme durumları (*İşleniyor, Tamamlandı, Hata, Bekliyor*).
- Parça (chunk) adedi, depolama boyutu ve vektör boyut bilgileri.

### 3.4. Kullanıcılar & Esnek RBAC Yönetimi Ekranı

- Kayıtlı kullanıcı listesi, arama, filtreleme ve hesap dondurma/aktif etme.
- Yeni kullanıcı onaylama/reddetme kuyruğu (*"Onay Bekliyor"* durumundaki açık kayıtlar).
- Davet linki veya tek kullanımlık kayıt kodu üretme modalı.
- Esnek Rol Matrisi: Ana şablonlar (`Admin`, `User`) ve bunlardan türetilen departman rolleri. Kullanıcı bazlı yetki ezme (override) paneli.

### 3.5. Denetim Kayıtları (Audit Logs) ve Raporlama

- Kullanıcı bazlı, model bazlı ve tarih bazlı filtrelemeli sorgulama.
- Kimin ne zaman hangi modeli kullandığı, oturum süresi ve tüketilen token miktarı.
- CSV / JSON formatında dışa aktarma (export).

---

## 4. Görünüm & Tema Entegrasyonu

- Tasarım dili ortak [Nexus Precision](../common/design_system_and_tokens.md) standartlarına tam uyumludur.
- Sol alttaki profil çarkından açılan Görünüm Ayarları Modalı üzerinden sistem teması (`prefers-color-scheme`) veya Aydınlık/Karanlık mod ve 4 kurumsal palet (Indigo, Emerald, Obsidian, Ocean) seçilebilir.
