# ADMIN INTERFACE FRONTEND VE BİLEŞEN GELİŞTİRME STANDARTLARI

> **DOKÜMAN TİPİ:** Alt Proje Kodlama ve UI Standartları (`apps/admin-interface`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_)  
> **İlişkili Dokümanlar:** [Tasarım Sistemi](../common/design_system_and_tokens.md), [OpenAPI Sözleşmesi](../openapi.json)  

---

## 1. Temel Prensipler ve Teknoloji Seçimi

1. **Teknoloji Yığını:** React 18+, TypeScript, Tailwind CSS, Vite.
2. **Sıfır Dış UI Bağımlılığı (Zero/Low Dependency):**
   - Radix UI, Material UI (MUI), Ant Design veya AG-Grid gibi ağır üçüncü parti UI kütüphaneleri **kesinlikle kurulamaz ve kullanılamaz**.
   - Tüm admin bileşenleri (Veri Tabloları, Modallar, Drawer'lar, Dropdown'lar, Sekmeler) projenin kendi kod tabanında (`apps/admin-interface/src/components/ui/`) saf React + Tailwind ile yazılmalıdır.
3. **Tip Güvenliği ve API Senkronizasyonu:**
   - Backend tarafından üretilen [openapi.json](../openapi.json) şeması referans alınır. DTO ve veri tipleri doğrudan API sözleşmesiyle uyumlu tutulur.

---

## 2. Admin UI Bileşen Standartları

### 2.1. Veri Tabloları (Data Tables)

- **Gereksinimler:** Sayfalama (Pagination), sıralama (Sorting), metin araması ve duruma göre filtreleme rozetleri.
- **Tasarım:** "Nexus Precision" standartlarında ince kenarlıklar (`border-slate-200 dark:border-slate-800`), zebra şeritler veya hover vurgusu (`hover:bg-slate-50 dark:hover:bg-slate-900/50`).
- **Örnek Yapı:** Saf HTML `table`, `thead`, `tbody`, `tr`, `td` elementleri ile esnek React state yönetimi.

### 2.2. Modal ve Onay Pencereleri (Dialogs & Drawers)

- Saf React portalları (`createPortal`) veya backdrop overlay'leri kullanılarak kodlanır.
- `Escape` tuşu ile kapanma ve dışarı tıklamayı algılama (`useOnClickOutside`) kancaları içerir.
- Form içeren modallarda kaydedilmemiş değişiklik uyarısı verilir.

### 2.3. Durum ve İlerleme Göstergeleri (Status Badges & Progress Bars)

- Model indirme ilerlemesi: Tailwind animasyonlu progress bar (`bg-brand-500 transition-all duration-300`).
- Sistem sağlık rozetleri: `online` (yeşil nokta ve açık yeşil zemin), `warning` (kehribar), `error` (kırmızı).

---

## 3. Sayfa ve Dizin Düzeni (`apps/admin-interface/src/`)

```
src/
├── assets/                  # İkonlar ve statik dosyalar
├── components/
│   ├── layout/              # AdminLayout, AdminSidebar, AdminHeader
│   ├── ui/                  # Button, Table, Modal, Badge, Input, Select, Progress
│   └── widgets/             # KPIWidget, TelemetryChart, ModelDownloadRow
├── pages/
│   ├── DashboardPage.tsx    # Genel Bakış
│   ├── ModelsPage.tsx       # Model & Sağlayıcı Yönetimi
│   ├── RAGPage.tsx          # Bilgi Bankası & İndeksleme
│   ├── UsersPage.tsx        # Kullanıcılar & RBAC
│   ├── AuditLogsPage.tsx    # Denetim Kayıtları
│   └── SettingsPage.tsx     # Sistem Ayarları
├── services/                # API istemcileri (apiClient.ts, modelsApi.ts, usersApi.ts)
├── hooks/                   # useTheme, useModels, usePagination
└── types/                   # TypeScript arayüzleri ve DTO'lar
```
