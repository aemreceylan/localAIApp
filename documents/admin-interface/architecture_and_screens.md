# ADMIN INTERFACE (YÖNETİCİ PANELİ) MİMARİSİ VE EKRAN SPESİFİKASYONU

> **DOKÜMAN TİPİ:** Alt Proje Özel Mimari & UI Şartnamesi (`apps/admin-interface`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_)  
> **İlişkili Dokümanlar:** [Ortak PRD v2.1.0](../common/prd.md), [Tasarım Sistemi](../common/design_system_and_tokens.md), [Canlı Tasarım Prototipi](../stitch_design_preview.html)  
> **Rol:** AI Lead Product Designer & Admin Systems Architect  

---

## 1. Giriş ve Amaç

Bu doküman, `apps/admin-interface` alt projesinin sayfa mimarisini, navigasyon yapısını, yönetici paneli bileşenlerini, güvenlik kurgusunu ve telemetri ekranlarını tanımlar. 

Yönetici Paneli; platformun donanım kaynaklarını, LLM modellerini, bilgi bankasını (RAG), kullanıcı onay havuzunu/davetiyeleri ve dinamik RBAC yetkilendirmesini tek bir merkezden sade, modern ve yüksek performanslı bir arayüzle yönetmek üzere tasarlanmıştır.

---

## 2. Teknoloji Yığını ve Mimari Standartlar

- **Çekirdek:** React 19 + React Compiler (otomatik memoization & render optimizasyonu)
- **Derleyici & Sunucu:** Vite 7 (Native ESM, Port 5174, Reverse Proxy `/admin`)
- **Stil & Tasarım:** Tailwind CSS v4 (CSS-first `@theme` token mimarisi, "Nexus Precision" tasarım dili)
- **Yönlendirme (Routing):** React Router v7
- **Veri Yönetimi & Önbellek:** `@tanstack/react-query` v5 (otomatik deduplication, background refetch, stale-while-revalidate, request abort)
- **UI Bileşenleri (Sıfır Harici UI Bağımlılığı):** Saf React + Tailwind (Radix, MUI, AntD, AG-Grid kesinlikle yasaktır). Tablolar, modallar, drawer'lar ve grafikler projenin kendi kod tabanında sıfır şişkinlikle yazılır.
- **Güvenlik & Oturum Mimarisi:**
  - Token asla `localStorage` içinde tutulmaz (XSS saldırılarına karşı mutlak koruma).
  - Backend destekli `HttpOnly` + `Secure` + `SameSite=Strict` cookie (`admin_token`) kullanılır.
  - Oturum Politikası: 30 dakika hareketsizlik (idle timeout) + 8 saat mutlak süre aşımı (absolute timeout).
  - İstemci Seviyesi Savunma (AppSec): Form submit spam koruması (request throttling/debouncing), katı Zod validasyonu, DOM sanitization.

---

## 3. Navigasyon ve Ekran Hiyerarşisi

Yönetici arayüzü, sol sabit menü ve ana içerik alanından oluşan modern bir B2B SaaS dashboard mimarisine sahiptir:

```
Admin Dashboard Layout
├── Sol Sabit Menü (Sidebar)
│   ├── Logo & Kurum Başlığı (NexusAI Gateway Admin)
│   ├── 1. Genel Bakış & Telemetri (Dashboard Overview)
│   ├── 2. LLM & Yerel Modeller (Model Management & SSE Pull)
│   ├── 3. Bilgi Bankası / RAG (Knowledge Base, Roles & Ingestion)
│   ├── 4. Kullanıcılar & Onay Havuzu (Users, Invites & Onboarding)
│   ├── 5. Esnek RBAC & İzin Matrisi (Roles, Templates & Overrides)
│   ├── 6. Denetim Kayıtları (Audit & Security Logs)
│   ├── 7. Sistem Ayarları (Queue Engine & Hot-Reload Settings)
│   └── Alt Durum Göstergesi (Ollama / BullMQ Engine Status)
└── Ana İçerik Alanı
    ├── Üst Durum & Telemetri Çubuğu (System Health, CPU/RAM, Uptime, Anlık Kullanıcılar)
    └── İlgili Sayfa İçeriği
```

---

## 4. Ekran Detayları ve Fonksiyonel Kapsam

### 4.1. Genel Bakış & Donanım/İstek Telemetrisi (Dashboard Overview)

- **Üst Durum & Telemetri Çubuğu:**
  - Sistem Sağlığı: `Uptime: %99.98`, `CPU Yükü: %24`, `RAM: 6.2GB / 32GB`, `Ollama VRAM: 14.8GB`.
- **4 Ana KPI Kartı:**
  1. **Toplam Token Kullanımı:** Dönemsel tüketim rakamı (prompt/completion) ve haftalık değişim yüzdesi.
  2. **HTTP İstek Sayısı & Ort. Yanıt Süresi:** Son 24 saatlik istek hacmi ve p95 yanıt gecikmesi (Redis dakikalık kovalardan).
  3. **Aktif Yerel Modeller:** Kullanıma hazır / indirilmiş model oranı ve Ollama bellek durumu.
  4. **Kullanıcı Havuzu:** Aktif kullanıcılar, çevrim içi personel ve onay bekleyen yeni başvurular.
- **Grafikler ve Metrikler:**
  - 24 saatlik HTTP İstekleri & Hata Dağılımı (2xx, 4xx, 5xx).
  - 24 saatlik Token tüketimi ve model bazlı İlk Token Gecikmesi (Time to First Token - TTFT) tablosu.
  - Sistem Kaynak Tüketimi (CPU, RAM, Event-Loop lag, Disk doluluk oranı).

### 4.2. LLM & Yerel Model Yönetimi Ekranı

- **Model Listesi & İzin Yönetimi:**
  - Aktif/pasif yerel (Ollama) ve bulut modellerin listesi.
  - Hangi rollerin hangi modelleri görebileceğinin yapılandırılması.
  - Dinamik Varsayılan Model seçimi (Kural 5 uyarınca hardcoded model yoktur; veritabanından dinamik yönetilir).
- **Lokal Model İndirme Yöneticisi Tablosu:**
  - Model Adı, Disk Boyutu, Parametre Boyutu (örn: 8B, 70B), Durum Rozeti.
  - SSE Tabanlı Canlı İlerleme Çubuğu: Anlık yüzde, indirilen boyut, kalan süre ve MB/s transfer hızı.
  - Model Aksiyonları: *Varsayılan Yap, Diskten Sil, Yeniden Başlat*.

### 4.3. Bilgi Bankası (RAG) & Doküman Yönetimi Ekranı

- Bilgi bankasına yüklenmiş tüm dokümanların listesi, dosya boyutu, MIME türü, chunk adedi.
- İndeksleme durumları (*İşleniyor, Tamamlandı, Hata, Bekliyor*).
- Belge Erişim Rolleri Düzenleme (Document ACL - `allowed_roles`): Belirli belgeleri yalnızca belirli departmanlara/rollere açma.
- Bull-Board Kuyruk Yönetim Entegrasyonu: Arka plandaki BullMQ kuyruğunun durumunu tek tıkla izleme ve retry yapabilme.

### 4.4. Kullanıcılar, Onay Havuzu & Davetiyeler (Users & Onboarding)

- **Kayıtlı Kullanıcılar Tablosu:**
  - E-posta, Ad Soyad, Sistem Rolü (`admin`, `user`), Fonksiyonel Roller (`developer`, `hr` vb.), Durum rozeti (`Aktif`, `Banlı`).
  - Hızlı Aksiyonlar: Banla / Banı Kaldır, Admin Yap / Adminliği Al, Rolleri Düzenle.
- **Onay Bekleyen Kayıtlar Havuzu (Approval Queue):**
  - Kendi kendine kayıt olan personeller *"Onay Bekliyor"* sekmesinde listelenir.
  - Admin tek tıkla *Onayla & Rol Ata* veya *Reddet* işlemi yapar.
- **Süreli / Tek Kullanımlık Davet Kodu Üretici:**
  - Admin belirli rollerle ilişkilendirilmiş davet kodu üretir.
  - Maksimum kullanım sayısı (varsayılan: 1 kişi) ve geçerlilik süresi (örn: 24 saat, 7 gün) belirlenir.
  - Arayüzde "Güvenlik uyarısı: Davet kodlarını tek kişilik oluşturmanız önerilir" rozeti gösterilir.

### 4.5. Esnek RBAC & İzin Matrisi

- **Rol Şablonları:** Sistem yöneticisi, standart kullanıcı ve departman rolleri (`developer`, `hr`, `finance` vb.).
- **Yetki Tavanı Koruması:** `user` arketipindeki rollere `admin:` izinlerinin verilmesi arayüzde ve backend'de kilitlidir.
- **Kullanıcı Bazlı Yetki Ezme (Override):** Rol haricinde tek bir kullanıcıya özel yetki ekleme (`allow`) veya çıkarma (`deny`).
- **Yetki Simülatörü:** Bir kullanıcının seçilen kaynak için erişim hakkını anında test eden doğrulama aracı.

### 4.6. Denetim Kayıtları (Audit Logs)

- Değişmez (immutable) güvenlik olayları günlüğü: Kullanıcı banlama, admin atama, rol değişikliği, belge erişim güncellemesi.
- Aktör, aksiyon, hedef, IP adresi, tarayıcı ve tarih filtrelemeleri.
- CSV ve JSON formatında dışa aktarma (export).

### 4.7. Sistem Ayarları (Settings & Environment)

- RAG & BullMQ Kuyruk Ayarları (Concurrency, chunk boyutu, overlap, retry attempts) hot-reload ile canlı güncelleme.
- Güvenlik ve oturum politikası ayarları.

---

## 5. Görünüm & Tema Entegrasyonu

- Tasarım dili [Nexus Precision](../common/design_system_and_tokens.md) standartlarına tam uyumludur.
- Sistem teması (`prefers-color-scheme`) varsayılandır; profil menüsünden Aydınlık/Karanlık mod ve 4 kurumsal palet (Indigo, Emerald, Obsidian, Ocean) seçilebilir.
