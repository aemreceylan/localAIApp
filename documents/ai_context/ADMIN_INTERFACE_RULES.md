# ADMIN_INTERFACE_RULES.md — AI Agent Admin Interface Kuralları

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (AI Agents)  
> **KAPSAM:** Alt Proje `apps/admin-interface`  
> **AMAÇ:** Yönetici arayüzü (`apps/admin-interface`) üzerinde kod üretirken uyulması zorunlu olan saf React + Tailwind kuralları, sıfır dış bağımlılık prensibi, veri tabloları, RBAC UI kısıtlamaları ve API entegrasyon kuralları.

---

## 1. Kesin Kısıtlamalar (Non-Negotiable Constraints)

1. **Sıfır / Minimum Dış UI Bağımlılığı (Zero External UI Dependencies):**
   - Radix UI, Ant Design, Material UI (MUI), AG-Grid, HeadlessUI gibi harici UI kütüphaneleri **kesinlikle kurulamaz ve package.json'a eklenemez**.
   - Tüm admin bileşenleri (`Table`, `Modal`, `Drawer`, `Dropdown`, `Pagination`, `Tabs`, `Badge`, `Progress`, `Chart`) projenin kendi kod tabanında (`src/components/ui/`) saf React 19+ ve Tailwind CSS v4 ile yazılacaktır.
   - İzin verilen yardımcı kütüphaneler: `react-router` (v7), `@tanstack/react-query` (v5), `lucide-react` (ikonlar).
2. **Modern Teknoloji & Performans Mimarisi:**
   - React 19 + React Compiler entegrasyonu (bileşenler otomatik memoize edilir, gereksiz yeniden render'lar engellenir).
   - Tailwind CSS v4 CSS-first token mimarisi (`@theme`, "Nexus Precision").
   - TanStack Query ile ağ seviyesinde request deduplication, optimistic updates ve 429 Retry-After desteği.
3. **Admin Oturum Güvenliği (HttpOnly Cookie):**
   - Admin token asla `localStorage`'da saklanmaz. Backend'den `HttpOnly` + `Secure` + `SameSite=Strict` cookie (`admin_token`) ile yönetilir.
   - Hareketsizlik (idle timeout: 30 dk) ve mutlak süre aşımı (8 saat) arayüzde geri sayım ve uyarı modalı ile desteklenir.
4. **Hardcoded Model Yasağına Uygun Arayüz (Kural 5):**
   - Admin arayüzünde hiçbir formda, dropdown'da veya state'te varsayılan bir model adı sabitlenemez.
   - Tüm model listeleri backend API'sinden (`GET /api/chat/models` veya `/api/admin/models`) dinamik çekilir.
5. **Tema Mimarisi & Renk Paletleri:**
   - Sistem teması (`prefers-color-scheme`) varsayılandır.
   - Renk paletleri (Indigo, Emerald, Obsidian, Ocean) `html[data-palette="..."]` özniteliği üzerinden yönetilir.
   - Görünüm ayarları sol alt profildeki çarktan açılan modal içindedir; ana sayfada kalabalık yapılmaz.
6. **Tip Güvenliği ve OpenAPI Uyumu:**
   - Frontend DTO'ları ve veri modelleri, [documents/openapi.json](../openapi.json) spesifikasyonu ile birebir uyumlu olmalıdır.

---

## 2. Admin UI Bileşen Standartları

### 2.1. Saf Veri Tabloları (`components/ui/Table.tsx`)
- Sayfalama (Pagination: sayfa numaraları, önceki/sonraki, sayfa başına kayıt adedi).
- Sütuna göre sıralama (Sorting: Artan/Azalan ok ikonları).
- Durum filtreleme rozetleri (`active`, `banned`, `pending_approval`).
- Mobil/küçük ekranlarda yatay kaydırma (`overflow-x-auto`).

### 2.2. Modal ve Drawer Yönetimi (`components/ui/Modal.tsx`)
- React `createPortal` ile `#modal-root` veya `document.body` üzerine render edilir.
- `Escape` tuşu ve arka plana (backdrop) tıklama ile kapanma desteği.
- Açıldığında arka plan scroll'u kilitlenir (`overflow-hidden`).

### 2.3. Model İndirme İlerleme Barı (`components/widgets/ModelDownloadRow.tsx`)
- Backend'den gelen SSE akışındaki yüzde ve transfer hızı (MB/s) bilgilerini anlık reaktif yansıtır.
- İptal / Duraklat butonları API abort controller ile entegre çalışır.

### 2.4. Telemetri & Metrik Kartları (`components/widgets/TelemetryCard.tsx`)
- CPU, RAM, Uptime ve Redis tabanlı HTTP istek adet/gecikme metriklerini anlık sunan kompakt kartlar.
- Canvas/SVG tabanlı hafif mikro çizgi grafikler (dış grafik kütüphanesi olmadan saf SVG).

---

## 3. RBAC ve Yetkilendirme Kuralları (Frontend)

1. **Sayfa ve Buton Koruması:**
   - `superadmin` ve `admin` sistem rolleri arasında hiyerarşi korunur.
   - Sistem sahiplik devri (`superadmin/transfer`) yalnızca `superadmin` kullanıcısına açıktır.
2. **Kullanıcı Onay Akışı:**
   - Açık kayıtla gelen personeller onaylanana kadar arayüzde *"Onay Bekliyor"* rozeti ile listelenir ve tek tıkla onaylama/reddetme butonları sunulur.
3. **Davet Kodu Üretimi:**
   - Süreli ve tek kişilik/sınırlı davet kodu üretme modalında güvenlik uyarıları gösterilir.

---

## 4. Dizin ve Dosya Standartları (`apps/admin-interface/src/`)

```
src/
├── components/
│   ├── layout/       # AdminLayout.tsx, Sidebar.tsx, Header.tsx
│   ├── ui/           # Table.tsx, Modal.tsx, Badge.tsx, Button.tsx, Input.tsx, Tabs.tsx
│   └── widgets/      # KPIWidget.tsx, TelemetryCard.tsx, ModelDownloadRow.tsx, MiniChart.tsx
├── pages/
│   ├── DashboardPage.tsx
│   ├── ModelsPage.tsx
│   ├── RAGPage.tsx
│   ├── UsersPage.tsx
│   ├── RolesPage.tsx
│   ├── AuditLogsPage.tsx
│   └── SettingsPage.tsx
├── services/         # apiClient.ts, modelsApi.ts, usersApi.ts, metricsApi.ts, ragApi.ts
├── hooks/            # useTheme.ts, useAuth.ts, useMetrics.ts, usePagination.ts
└── types/            # admin.types.ts, metrics.types.ts
```
