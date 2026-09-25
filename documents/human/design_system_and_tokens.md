# "Nexus Precision" Tasarım Sistemi ve Stil Belirteçleri (Tokens)

Bu doküman, Kurumsal LLM Platformunun görsel stil kurallarını, CSS Değişkenlerini (Custom Properties), tipografi skalasını ve Tailwind konfigürasyonunu tanımlar.

---

## 1. Tema ve Renk Sistemi Mimarisi

Sistem harici bir tema kütüphanesi olmadan saf CSS Custom Properties ile çalışır. `:root` üzerine varsayılan palet yüklenir, seçilen palete göre `html[data-palette="..."]` özniteliği güncellenir.

### 1.1. Renk Paletleri Tanımları

```css
/* 1. Nexus Indigo (Varsayılan - Modern AI & Tech) */
:root, [data-palette="indigo"] {
  --brand-50: #eef2ff;
  --brand-100: #e0e7ff;
  --brand-200: #c7d2fe;
  --brand-500: #6366f1;
  --brand-600: #4f46e5;
  --brand-700: #4338ca;
  --brand-900: #312e81;
}

/* 2. Emerald Sentinel (Güvenlik, Finans & Mevzuat) */
[data-palette="emerald"] {
  --brand-50: #ecfdf5;
  --brand-100: #d1fae5;
  --brand-200: #a7f3d0;
  --brand-500: #10b981;
  --brand-600: #059669;
  --brand-700: #047857;
  --brand-900: #064e3b;
}

/* 3. Obsidian Minimal (Monokrom Minimalizm - Linear/Vercel) */
[data-palette="obsidian"] {
  --brand-50: #f4f4f5;
  --brand-100: #e4e4e7;
  --brand-200: #d4d4d8;
  --brand-500: #3f3f46;
  --brand-600: #27272a;
  --brand-700: #18181b;
  --brand-900: #09090b;
}

/* 4. Cyber Ocean (Derin Mavi & Bulut Altyapısı) */
[data-palette="ocean"] {
  --brand-50: #f0f9ff;
  --brand-100: #e0f2fe;
  --brand-200: #bae6fd;
  --brand-500: #0ea5e9;
  --brand-600: #0284c7;
  --brand-700: #0369a1;
  --brand-900: #0c4a6e;
}
```

---

## 2. Tipografi Skalası

İki temel yazı tipi ailesi kullanılır:
1. **Inter:** UI metinleri, başlıklar, kullanıcı mesajları ve genel navigasyon.
2. **JetBrains Mono:** Kod blokları, Qdrant Chunk ID'leri, token sayıları, gecikme süreleri (ms) ve telemetri metrikleri.

| Seviye | Boyut | Satır Yüksekliği (Line Height) | Ağırlık | Kullanım Yeri |
| :--- | :--- | :--- | :--- | :--- |
| `display` | 32px | 40px | Bold (700) | Landing ve karşılama başlıkları |
| `headline-lg` | 24px | 32px | SemiBold (600) | Dashboard ana kart rakamları |
| `headline-md` | 20px | 28px | SemiBold (600) | Panel başlıkları, modal başlıkları |
| `headline-sm` | 16px | 24px | SemiBold (600) | Bölüm ve widget başlıkları |
| `body-md` | 14px | 22px | Regular (400) | Asistan yanıtları ve sohbet gövdesi |
| `body-sm` | 13px | 20px | Regular (400) | Yardımcı açıklamalar ve alt metinler |
| `label-md` | 12px | 16px | Medium (500) | Mono etiketler, tablo başlıkları |
| `label-sm` | 11px | 14px | Medium (500) | Token sayaçları, rozetler, dipnotlar |

---

## 3. Spacing ve Radius Kuralları

- **Bileşen Köşe Yuvarlaklığı (Border Radius):**
  - Rozetler, Butonlar ve Kod Blokları: `rounded-md` (`6px`) veya `rounded-lg` (`8px`)
  - Kartlar ve Tablolar: `rounded-xl` (`12px`)
  - Yüzen Prompt Dock'u ve Modallar: `rounded-2xl` (`16px`)
  - Yuvarlak sayaçlar ve avatarlar: `rounded-full` (`9999px`)

- **Yüzey Yükseltmeleri (Shadows):**
  - Seviye 1 (Kartlar): `shadow-sm` (`0 1px 2px 0 rgb(0 0 0 / 0.05)`)
  - Seviye 2 (Yüzen Dock): `shadow-lg` (`0 10px 15px -3px rgb(0 0 0 / 0.1)`)
  - Seviye 3 (Modallar & Popover): `shadow-2xl` (`0 25px 50px -12px rgb(0 0 0 / 0.25)`)
