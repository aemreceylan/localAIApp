# ADMIN INTERFACE FRONTEND VE BİLEŞEN GELİŞTİRME STANDARTLARI

> **DOKÜMAN TİPİ:** Alt Proje Kodlama ve UI Standartları (`apps/admin-interface`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_)  
> **İlişkili Dokümanlar:** [Tasarım Sistemi](../common/design_system_and_tokens.md), [OpenAPI Sözleşmesi](../openapi.json)  

---

## 1. Temel Prensipler ve Teknoloji Seçimi

1. **Teknoloji Yığını:** React 19 + React Compiler (otomatik memoization), TypeScript, Tailwind CSS v4 (`@theme` token mimarisi), Vite 7, React Router v7, TanStack Query v5.
2. **Sıfır Dış UI Bağımlılığı (Zero/Low Dependency):**
   - Radix UI, Material UI (MUI), Ant Design veya AG-Grid gibi ağır üçüncü parti UI kütüphaneleri **kesinlikle kurulamaz ve kullanılamaz**.
   - Tüm admin bileşenleri (Veri Tabloları, Modallar, Kartlar, Rozetler, Butonlar, İlerleme Çubukları) projenin kendi kod tabanında (`apps/admin-interface/src/components/ui/`) saf React 19 + Tailwind v4 ile yazılmıştır.
3. **Tip Güvenliği ve API Senkronizasyonu:**
   - Backend tarafından üretilen [openapi.json](../openapi.json) şeması referans alınır. DTO ve veri tipleri doğrudan API sözleşmesiyle uyumlu tutulur.
   - Node.js Native ESM Subpath Imports (`#*`) kullanılır.

---

## 2. Admin UI Bileşen Standartları

### 2.1. Veri Tabloları (Data Tables - `Table.tsx`)
- **Gereksinimler:** Sıralanabilir kolonlar (`sortable`), duyarlı (responsive) yatay kaydırma, boş durum (`emptyText`), satır tıklama ve özel hücre formatlayıcıları.
- **Tasarım:** "Nexus Precision" standartlarında ince kenarlıklar (`border-slate-200 dark:border-slate-800`), zebra şeritler ve hover geçişi (`hover:bg-slate-50/80 dark:hover:bg-slate-900/60`).

### 2.2. Modal ve Onay Pencereleri (Dialogs - `Modal.tsx`)
- Saf React portalları (`createPortal`) ve backdrop blur katmanı (`backdrop-blur-sm`).
- `Escape` tuşu ile kapanma, backdrop tıklama desteği, otomatik focus yönetimi ve `size` seçenekleri (`sm`, `md`, `lg`, `xl`).

### 2.3. Hareketsizlik Güvenlik Modalı (`IdleTimeoutModal.tsx`)
- 30 dakikalık boşta kalma süresinde son 2 dakika kala tetiklenen güvenlik uyarısı.
- Kullanıcıya oturumun sonlandırılacağı süreyi dinamik geri sayımla gösterir; "Oturumu Açık Tut" veya "Şimdi Çıkış Yap" butonları sunar.

### 2.4. Durum ve İlerleme Göstergeleri (`Badge.tsx` & `Progress.tsx`)
- Model indirme ilerlemesi: Canlı SSE akışı ile senkronize dinamik Tailwind progress bar (`h-2 rounded-full overflow-hidden transition-all duration-300`).
- Durum rozetleri: `success` (yeşil), `warning` (kehribar), `danger` (kırmızı), `neutral` (slate), `info` (mavi).

---

## 3. Sayfa ve Dizin Düzeni (`apps/admin-interface/src/`)

```
src/
├── components/
│   ├── layout/              # AdminLayout, AdminSidebar, AdminHeader
│   └── ui/                  # Button, Table, Modal, Badge, Input, Card, Progress, IdleTimeoutModal
├── pages/
│   ├── DashboardPage.tsx    # Canlı Telemetri, KPI'lar, Gecikme & Kaynak Kullanımı
│   ├── ModelsPage.tsx       # Model Yönetimi & Canlı Ollama SSE İndirme
│   ├── UsersPage.tsx        # Kullanıcılar, Roller & İstisnai Yetkiler (Override)
│   ├── OnboardingPage.tsx   # Kayıt Başvuruları Onay Havuzu (Approve / Reject)
│   ├── InvitationsPage.tsx  # Kriptografik Davetiyeler (nx_inv_*) & Kota Yönetimi
│   └── LoginPage.tsx        # Güvenli Giriş & Superadmin İlk Kurulum Formu
├── services/                # API istemcileri (apiClient.ts, authApi.ts, modelsApi.ts, telemetryApi.ts)
├── hooks/                   # useTheme, useAuth, useIdleTimer
├── types/                   # TypeScript arayüzleri, DTO'lar & İzin Sabitleri
└── layouts/                 # AdminLayout & Ana Kapsayıcı
```
