# ADMIN_INTERFACE_RULES.md — AI Agent Admin Interface Kuralları

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (AI Agents)  
> **KAPSAM:** Alt Proje `apps/admin-interface`  
> **AMAÇ:** Yönetici arayüzü (`apps/admin-interface`) üzerinde kod üretirken uyulması zorunlu olan saf React + Tailwind kuralları, sıfır dış bağımlılık prensibi, veri tabloları, RBAC UI kısıtlamaları ve API entegrasyon kuralları.

---

## 1. Kesin Kısıtlamalar (Non-Negotiable Constraints)

1. **Sıfır / Minimum Dış UI Bağımlılığı (Zero External UI Dependencies):**
   - Radix UI, Ant Design, Material UI (MUI), AG-Grid, HeadlessUI gibi harici kütüphaneler **kesinlikle kurulamaz ve package.json'a eklenemez**.
   - Tüm admin bileşenleri (`Table`, `Modal`, `Drawer`, `Dropdown`, `Pagination`, `Tabs`, `Badge`, `Progress`) projenin kendi kod tabanında (`src/components/ui/`) saf React 18+ ve Tailwind CSS ile yazılacaktır.
2. **Hardcoded Model Yasağına Uygun Arayüz (Kural 5):**
   - Admin arayüzünde hiçbir formda, dropdown'da veya state'te varsayılan bir model adı sabitlenemez.
   - Tüm model listeleri backend API'sinden (`GET /api/models` veya ilgili tenant endpoint'i) dinamik olarak çekilir.
3. **Tema Mimarisi & Renk Paletleri:**
   - Sistem teması (`prefers-color-scheme`) varsayılandır.
   - Renk paletleri (Indigo, Emerald, Obsidian, Ocean) `html[data-palette="..."]` özniteliği üzerinden yönetilir.
   - Görünüm ayarları sol alt profildeki çarktan açılan modal içindedir; ana sayfada kalabalık yapılmaz.
4. **Tip Güvenliği ve OpenAPI Uyumu:**
   - Frontend DTO'ları ve veri modelleri, [documents/openapi.json](../openapi.json) spesifikasyonu ile birebir uyumlu olmalıdır.

---

## 2. Admin UI Bileşen Standartları

### 2.1. Saf Veri Tabloları (`components/ui/Table.tsx`)
- Sayfalama (Pagination: sayfa numaraları, önceki/sonraki, sayfa başına kayıt adedi).
- Sütuna göre sıralama (Sorting: Artan/Azalan ok ikonları).
- Durum filtreleme rozetleri (`active`, `pending`, `suspended`).
- Mobil/küçük ekranlarda yatay kaydırma (`overflow-x-auto`).

### 2.2. Modal ve Drawer Yönetimi (`components/ui/Modal.tsx`)
- React `createPortal` ile `#modal-root` veya `document.body` üzerine render edilir.
- `Escape` tuşu ve arka plana (backdrop) tıklama ile kapanma desteği.
- Açıldığında arka plan scroll'u kilitlenir (`overflow-hidden`).

### 2.3. Model İndirme İlerleme Barı (`components/widgets/ModelDownloadRow.tsx`)
- Backend'den gelen SSE akışındaki yüzde ve transfer hızı (MB/s) bilgilerini anlık reaktif yansıtır.
- İptal / Duraklat butonları API abort controller ile entegre çalışır.

---

## 3. RBAC ve Yetkilendirme Kuralları (Frontend)

1. **Sayfa ve Buton Koruması:**
   - `superadmin` ve `tenant_admin` rolleri arasında net sınır vardır.
   - Kiracı oluşturma/silme sayfaları yalnızca `superadmin` kullanıcısına açıktır.
   - `tenant_admin` yalnızca kendi kiracısına ait modelleri, kullanıcıları ve bilgi bankasını yönetebilir.
2. **Kullanıcı Onay Akışı:**
   - Açık kayıtla gelen personeller onaylanana kadar arayüzde *"Onay Bekliyor"* rozeti ile listelenir ve tek tıkla onaylama/reddetme butonları sunulur.

---

## 4. Dizin ve Dosya Standartları (`apps/admin-interface/src/`)

```
src/
├── components/
│   ├── layout/       # AdminLayout.tsx, Sidebar.tsx, Header.tsx
│   ├── ui/           # Table.tsx, Modal.tsx, Badge.tsx, Button.tsx, Input.tsx
│   └── widgets/      # KPIWidget.tsx, TelemetryCard.tsx
├── pages/
│   ├── DashboardPage.tsx
│   ├── ModelsPage.tsx
│   ├── RAGPage.tsx
│   ├── UsersPage.tsx
│   └── SettingsPage.tsx
├── services/         # apiClient.ts, modelsApi.ts, usersApi.ts
├── hooks/            # useTheme.ts, useModels.ts, usePagination.ts
└── types/            # admin.types.ts
```
