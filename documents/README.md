# Proje Bilgi Bankası (Knowledge Base Index)

**Kurumsal LLM & Veri Yönetim Platformu** (*NexusAI Gateway & Knowledge Base*) dökümantasyon havuzuna hoş geldiniz.

Bu bilgi bankası, hem **yazılım geliştiriciler ve ürün yöneticileri (İnsan Okuması)** hem de gelecekteki **Yapay Zeka Oturumları (AI Agents)** için projenin tek ve güncel doğruluk kaynağı (Single Source of Truth) olarak yapılandırılmıştır.

---

## 📁 Bilgi Bankası Dizin Yapısı

```
documents/
├── README.md                              # Bu master katalog ve kılavuz
├── openapi.json                           # Otomatik üretilen OpenAPI 3.0 API Dokümanı (JSON)
├── stitch_design_preview.html             # Canlı etkileşimli tasarım prototipi (Tarayıcıda açılabilir)
├── kurumsal_llm_veri_y_netim_platformu_prd.md # Ürün Gereksinimleri Belgesi (PRD v2.1.0)
├── software_architecture_document.md      # Sistem Mimarisi & Modüler Monolit Spesifikasyonu (SAD v1.2.0)
│
├── human/                                 # 1. İNSAN OKUMASINA YÖNELİK TASARIM VE MİMARİ ŞARTNAMELER
│   ├── data_and_business_workflows.md     # Veritabanı Mimarisi, ERD ve İş Mantığı Çalışma Şemaları (Mermaid)
│   ├── ui_ux_specification.md             # Kullanıcı & Yönetici Arayüzleri UI/UX Tasarım Şartnamesi
│   └── design_system_and_tokens.md        # "Nexus Precision" Tasarım Sistemi, Renk Paletleri & CSS Değişkenleri
│
└── ai_context/                            # 2. AI OTURUMLARINA YÖNELİK BELGELER (Yüksek Sinyal, Net Kurallar)
    ├── SYSTEM_CONTEXT.md                  # Proje özeti, teknoloji yığını, dizin haritası ve anlık durum
    ├── UI_FRONTEND_CONVENTIONS.md         # React, Tailwind ve Sıfır Bağımlılık (Zero-Dependency) Kuralları
    ├── ARCHITECTURE_RULES.md              # Modüler Monolit Mimarisi, Multi-Tenancy (RLS) ve Güvenlik Kuralları
    └── DEVELOPMENT_GUIDELINES.md          # AI çalışma prensipleri, anti-loop kuralı, test & dökümantasyon standartları
```

---

## 📌 Hızlı Bağlantılar

| Doküman | Hedef Kitle | Açıklama |
| :--- | :--- | :--- |
| **[OpenAPI 3.0 Spesifikasyonu](openapi.json)** | Tümü & Dış Sistemler | Koddan otomatik üretilen güncel REST API uç noktaları, DTO şemaları ve veri modelleri. (Swagger UI: `/api/docs`) |
| **[Veritabanı & İş Akış Şemaları](human/data_and_business_workflows.md)** | İnsan & AI | Bütünleşik MongoDB ERD, Qdrant payload şeması, Dinamik Prompt Stacking akışı, RAG Ingestion & Retrieval Sequence şemaları. |
| **[Canlı Tasarım Prototipi](stitch_design_preview.html)** | Tümü | Tarayıcıda doğrudan test edilebilen User Chat, Side-by-Side ve Admin Dashboard prototipi. |
| **[PRD Dokümanı](kurumsal_llm_veri_y_netim_platformu_prd.md)** | İnsan | v2.1.0 iş analizi, kullanıcı rolleri, RAG gereksinimleri ve MoSCoW MVP fazlandırması. |
| **[Yazılım Mimarisi (SAD)](software_architecture_document.md)** | İnsan | v1.2.0 Modüler Monolit, Bounded Contexts, Dinamik Prompt Stacking, MongoDB Mongoose RLS, Qdrant ve BullMQ akışları. |
| **[UI/UX Şartnamesi](human/ui_ux_specification.md)** | İnsan & AI | Onaylanan arayüz düzenleri, sağ RAG çekmecesi ve modal davranışları. |
| **[Tasarım Sistemi & Token'lar](human/design_system_and_tokens.md)** | İnsan & AI | 4 hazır renk paleti, tipografi ölçeği ve CSS değişkenleri. |
| **[AI Sistem Bağlamı](ai_context/SYSTEM_CONTEXT.md)** | AI Oturumları | AI ajanlarının oturum başında okuması gereken özet ve durum raporu. |
| **[AI Frontend Kuralları](ai_context/UI_FRONTEND_CONVENTIONS.md)** | AI Oturumları | React kodlarken minimum dış bağımlılık ve bileşen yazım standartları. |
| **[AI Mimari Kuralları](ai_context/ARCHITECTURE_RULES.md)** | AI Oturumları | Modüler Monolit, Bounded Contexts, katı veri izolasyonu ve RLS güvenlik kuralları. |
| **[AI Çalışma İlkeleri & Anti-Loop](ai_context/DEVELOPMENT_GUIDELINES.md)** | AI Oturumları | Token verimliliği, 5-deneme anti-loop kuralı, test stratejisi ve dökümantasyon yaşam döngüsü. |


---

## 💡 Bilgi Bankasını Güncel Tutma İlkesi
Bu projedeki her mimari karar, yeni eklenen ekran veya değiştirilen iş kuralı öncelikle bu dökümantasyon havuzuna işlenmelidir. Gelecekte projeye dahil olacak geliştiriciler ve AI asistanları daima bu belgeleri referans alacaktır.
