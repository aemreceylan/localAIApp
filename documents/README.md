# Proje Bilgi Bankası (Knowledge Base Index)

**Kurumsal LLM & Veri Yönetim Platformu** (*NexusAI Gateway & Knowledge Base*) dökümantasyon havuzuna hoş geldiniz.

Bu bilgi bankası, hem **yazılım geliştiriciler ve ürün yöneticileri (İnsan Okuması)** hem de gelecekteki **Yapay Zeka Oturumları (AI Agents)** için projenin tek ve güncel doğruluk kaynağı (Single Source of Truth) olarak yapılandırılmıştır.

---

## 📁 Bilgi Bankası Dizin Yapısı

```
documents/
├── README.md                              # Bu master katalog ve kılavuz
├── stitch_design_preview.html             # Canlı etkileşimli tasarım prototipi (Tarayıcıda açılabilir)
│
├── human/                                 # 1. İNSAN OKUMASINA YÖNELİK BELGELER (Detaylı, Görsel, Açıklayıcı)
│   ├── prd.md                             # Ürün Gereksinimleri Belgesi (PRD v2.1.0)
│   ├── software_architecture.md           # Sistem Mimarisi & Clean Architecture Spesifikasyonu (SAD v1.1.0)
│   ├── ui_ux_specification.md             # Kullanıcı & Yönetici Arayüzleri UI/UX Tasarım Şartnamesi
│   └── design_system_and_tokens.md        # "Nexus Precision" Tasarım Sistemi, Renk Paletleri & CSS Değişkenleri
│
└── ai_context/                            # 2. AI OTURUMLARINA YÖNELİK BELGELER (Yüksek Sinyal, Net Kurallar)
    ├── SYSTEM_CONTEXT.md                  # Proje özeti, teknoloji yığını, dizin haritası ve anlık durum
    ├── UI_FRONTEND_CONVENTIONS.md         # React, Tailwind ve Sıfır Bağımlılık (Zero-Dependency) Kuralları
    └── ARCHITECTURE_RULES.md              # Clean Architecture, Multi-Tenancy (RLS) ve Güvenlik Kuralları
```

---

## 📌 Hızlı Bağlantılar

| Doküman | Hedef Kitle | Açıklama |
| :--- | :--- | :--- |
| **[Canlı Tasarım Prototipi](file:///c:/Users/ahmet/Desktop/YAZILIM/localAIApp/documents/stitch_design_preview.html)** | Tümü | Tarayıcıda doğrudan test edilebilen User Chat, Side-by-Side ve Admin Dashboard prototipi. |
| **[PRD Dokümanı](file:///c:/Users/ahmet/Desktop/YAZILIM/localAIApp/documents/kurumsal_llm_veri_y_netim_platformu_prd.md)** | İnsan | v2.1.0 iş analizi, kullanıcı rolleri, RAG gereksinimleri ve MoSCoW MVP fazlandırması. |
| **[Yazılım Mimarisi (SAD)](file:///c:/Users/ahmet/Desktop/YAZILIM/localAIApp/documents/software_architecture_document.md)** | İnsan | v1.1.0 Clean Architecture, MongoDB Mongoose RLS, Qdrant ve BullMQ akışları. |
| **[UI/UX Şartnamesi](file:///c:/Users/ahmet/Desktop/YAZILIM/localAIApp/documents/human/ui_ux_specification.md)** | İnsan & AI | Onaylanan arayüz düzenleri, sağ RAG çekmecesi ve modal davranışları. |
| **[Tasarım Sistemi & Token'lar](file:///c:/Users/ahmet/Desktop/YAZILIM/localAIApp/documents/human/design_system_and_tokens.md)** | İnsan & AI | 4 hazır renk paleti, tipografi ölçeği ve CSS değişkenleri. |
| **[AI Sistem Bağlamı](file:///c:/Users/ahmet/Desktop/YAZILIM/localAIApp/documents/ai_context/SYSTEM_CONTEXT.md)** | AI Oturumları | AI ajanlarının oturum başında okuması gereken özet ve durum raporu. |
| **[AI Frontend Kuralları](file:///c:/Users/ahmet/Desktop/YAZILIM/localAIApp/documents/ai_context/UI_FRONTEND_CONVENTIONS.md)** | AI Oturumları | React kodlarken minimum dış bağımlılık ve bileşen yazım standartları. |

---

## 💡 Bilgi Bankasını Güncel Tutma İlkesi
Bu projedeki her mimari karar, yeni eklenen ekran veya değiştirilen iş kuralı öncelikle bu dökümantasyon havuzuna işlenmelidir. Gelecekte projeye dahil olacak geliştiriciler ve AI asistanları daima bu belgeleri referans alacaktır.
