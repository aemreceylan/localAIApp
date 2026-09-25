# UI_FRONTEND_CONVENTIONS.md — AI Agent Frontend Kuralları

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (AI Agents)  
> **AMAC:** React bileşenleri yazarken uyulması zorunlu olan stil, bağımlılık ve mimari kurallar.

---

## 1. Sıfır / Minimum Dış Bağımlılık İlkesi (Zero-Dependency)

### YASAKLI Paketler (Kesinlikle Kurulmayacak)
- `@radix-ui/*`, `@headlessui/react` — Primitives projeye ait olacak.
- `@mui/material`, `antd`, `@chakra-ui/react` — Ağır CSS-in-JS kütüphaneleri.
- `ag-grid-react`, `@tanstack/react-table` — Tablo bileşeni projenin kendi kodunda yazılacak.
- `react-icons`, `@heroicons/react` — Kullanılan ikonlar `Icons.tsx` içinde inline SVG olarak saklanacak.
- `framer-motion` — Animasyonlar CSS transitions/keyframes ile yapılacak.

### İZİN VERİLEN Zorunlu Paketler
- `react`, `react-dom` — Çekirdek.
- `react-router-dom` — Sayfa yönlendirmesi.
- `tailwindcss`, `postcss`, `autoprefixer` — Stil altyapısı.
- `typescript` — Tip güvenliği.
- `vite` — Geliştirme sunucusu ve build.

### İSTİSNA Durumlar (Onay Gerektirir)
Eğer bir işlev (örn: markdown render, syntax highlighting) sıfırdan yazmaya değmeyecek kadar karmaşıksa, kullanıcıya sormadan paket eklenmez. Gerekçe sunulur ve onay beklenir.

---

## 2. Bileşen Dizin Yapısı

```
src/
├── components/
│   ├── ui/                          # Saf React + Tailwind primitives
│   │   ├── Button.tsx               # Primary, Secondary, Ghost varyantları
│   │   ├── Modal.tsx                # <dialog> veya React Portal tabanlı
│   │   ├── Drawer.tsx               # Sağdan açılan RAG çekmecesi
│   │   ├── Dropdown.tsx             # useClickOutside hook kullanan
│   │   ├── Collapsible.tsx          # useState tabanlı aç/kapa
│   │   ├── ProgressBar.tsx          # İndirme ve kota barları
│   │   ├── Badge.tsx                # Durum ve model rozetleri
│   │   ├── Tabs.tsx                 # Kontrollü sekme bileşeni
│   │   ├── DataTable.tsx            # Sıralama, filtre ve sayfalama destekli
│   │   └── Icons.tsx                # Yalnızca kullanılan SVG'ler
│   ├── chat/                        # Sohbet bileşenleri
│   │   ├── ChatStream.tsx           # Akışlı mesaj render
│   │   ├── PromptDock.tsx           # Alt yüzen giriş alanı
│   │   ├── RagCitationTag.tsx       # Tıklanabilir [1] rozeti
│   │   ├── SideBySideArena.tsx      # Yan yana kıyaslama ekranı
│   │   └── ChatSidebar.tsx          # Sol sohbet geçmişi paneli
│   └── admin/                       # Yönetici bileşenleri
│       ├── TelemetryCards.tsx        # KPI metrik kartları
│       ├── LatencyWidget.tsx         # Canlı model gecikme tablosu
│       └── ModelDownloadTable.tsx    # Ollama model indirme yöneticisi
├── hooks/
│   ├── useTheme.ts                  # Tema modu (Sistem/Light/Dark) + Palet
│   ├── useClickOutside.ts           # Dropdown ve modal kapatma
│   └── useLocalStorage.ts           # Kalıcı tercih saklama
├── layouts/
│   ├── ChatLayout.tsx               # 3 sütunlu kullanıcı arayüzü iskeleti
│   └── AdminLayout.tsx              # Sol sidebar + üst bar + içerik bölgesi
└── styles/
    └── globals.css                   # CSS Custom Properties (Palet tanımları)
```

---

## 3. Tema ve Renk Paleti Kuralları

### Davranış Kuralları
1. İlk yüklemede `window.matchMedia('(prefers-color-scheme: dark)')` kontrol edilir.
2. Sonuç alınamazsa fallback: **Aydınlık (Light) Mod**.
3. Kullanıcının tercihi `localStorage` key `nexus_theme` altında saklanır (`'light'` | `'dark'` | kaldırılmış = sistem).
4. Renk paleti `localStorage` key `nexus_palette` altında saklanır (`'indigo'` | `'emerald'` | `'obsidian'` | `'ocean'`).
5. **Renk paleti seçicisi ana sohbet ekranında değil, "Görünüm Ayarları" modalı içinde derinde bulunur.** Bu kullanıcı tarafından kesinleştirilmiş bir UX kararıdır.

### CSS Değişkeni Uygulama Modeli
```css
/* globals.css */
:root {
  --brand-50: #eef2ff;   /* En açık */
  --brand-100: #e0e7ff;
  --brand-200: #c7d2fe;
  --brand-500: #6366f1;  /* Orta ton */
  --brand-600: #4f46e5;  /* Ana vurgu */
  --brand-700: #4338ca;  /* Hover / aktif */
  --brand-900: #312e81;  /* En koyu */
}

/* tailwind.config.ts */
colors: {
  brand: {
    50: 'var(--brand-50)',
    600: 'var(--brand-600)',
    /* ... */
  }
}
```

Palet değişiminde `document.documentElement.setAttribute('data-palette', 'emerald')` ile CSS selector tetiklenir.

---

## 4. Bileşen Yazım Standartları

### Zorunlu Kurallar
1. Her bileşen dosyası bir varsayılan export içerir (`export default function ComponentName`).
2. Props arayüzleri `ComponentNameProps` formatında aynı dosyada tanımlanır.
3. Inline stiller **YASAKTIR**; tüm stiller Tailwind sınıfları ile verilir.
4. Erişilebilirlik (a11y): Modal'larda `role="dialog"` ve `aria-modal="true"`, butonlarda `aria-label` veya görünür metin zorunludur.
5. Klavye navigasyonu: Modal'lar `Escape` ile kapanır, Dropdown'lar `Tab` ve `Arrow` tuşlarını destekler.

### Örnek Bileşen Kalıbı (Button.tsx)
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30';
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  };
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
```
