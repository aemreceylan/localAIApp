# AGENTS.md — AI Agent Guidance & Context Directory

> **DİKKAT (TÜM AI AJANLARI İÇİN):**  
> Bu dosya, projede çalışacak tüm yapay zeka modelleri ve kodlama asistanları (Antigravity, Gemini, Claude, Cursor vb.) için tek ve merkezi referans kılavuzudur.  
> Herhangi bir kod yazmadan veya mimari değişiklik yapmadan önce aşağıdaki kurallara ve `documents/ai_context/` altındaki belgelere harfiyen uyunuz.

---

## 1. Proje Kimliği ve Temel Vizyon
- **Proje Adı:** Kurumsal LLM & Veri Yönetim Platformu (*NexusAI Gateway & Knowledge Base*)
- **Dağıtım Modeli:** Self-Hosted / On-Premises (Müşteri veya kurum sunucularında yerel kurulum)
- **Ana Hedef:** Kurumların yerel LLM'leri (Ollama, vLLM) ve bulut modellerini (OpenAI, Anthropic) tek bir gateway üzerinden yönetmesi, RAG destekli bilgi bankası sorgulaması yapması ve esnek RBAC ile yetkilendirmesi.

---

## 2. Bilgi Bankası (Knowledge Base) Navigasyonu

Projenin kapsamlı dökümantasyonu `documents/` dizininde iki ana kategoride tutulmaktadır:

### A. AI Oturumları İçin Optimize Edilmiş Belgeler (`documents/ai_context/`)
1. [SYSTEM_CONTEXT.md](documents/ai_context/SYSTEM_CONTEXT.md):  
   Mimari yapı, teknoloji yığını, dizin kuralları ve anlık proje durumu.
2. [UI_FRONTEND_CONVENTIONS.md](documents/ai_context/UI_FRONTEND_CONVENTIONS.md):  
   React, Tailwind CSS, Sıfır/Minimum Dış Bağımlılık (Zero-Dependency) prensipleri, tema ve renk mimarisi.
3. [ARCHITECTURE_RULES.md](documents/ai_context/ARCHITECTURE_RULES.md):  
   Backend Clean Architecture, Row-Level Security (RLS) Multi-Tenancy kuralları ve Qdrant entegrasyonu.
4. [DEVELOPMENT_GUIDELINES.md](documents/ai_context/DEVELOPMENT_GUIDELINES.md):  
   AI çalışma prensipleri, token tasarrufu & 5-adım anti-loop kuralı, test stratejisi ve dökümantasyon yaşam döngüsü.

### B. İnsan Okumasına Yönelik Belgeler (`documents/human/`)
1. [prd.md](documents/kurumsal_llm_veri_y_netim_platformu_prd.md): Ürün Gereksinimleri Belgesi (PRD v2.1.0)
2. [software_architecture.md](documents/software_architecture_document.md): Yazılım Mimarisi & Clean Architecture (SAD v1.1.0)
3. [ui_ux_specification.md](documents/human/ui_ux_specification.md): Onaylanan UI/UX standartları ve ekran akışları.
4. [design_system_and_tokens.md](documents/human/design_system_and_tokens.md): "Nexus Precision" Tasarım Sistemi ve renk token'ları.
5. [stitch_design_preview.html](documents/stitch_design_preview.html): Canlı interaktif tasarım prototipi.

---

## 3. Asla İhlal Edilmeyecek Kritik Kurallar (Non-Negotiable Constraints)

1. **Minimum Dış Bağımlılık (Zero/Low Dependency):**  
   React arayüzlerinde gereksiz npm paketleri (ağır Radix, MUI, AntD, AG-Grid vb.) YASAKTIR.  
   Modal, Drawer, Dropdown, Collapsible, Tabs ve Table bileşenleri projenin kendi kaynak kodunda saf React + Tailwind ile yazılacaktır.
2. **Tema ve Renk Mimarisi:**  
   - Sistem teması (`prefers-color-scheme`) varsayılandır.  
   - Tespit edilemezse fallback: **Aydınlık (Light) Tema**.  
   - Renk paletleri ana sohbet ekranında değil, **Görünüm Ayarları Modalı** içinde "derinde" yer alır.
3. **Backend Clean Architecture:**  
   Domain katmanı tamamen saf TypeScript olacaktır; Express, Mongoose veya dış servis bağımlılığı içeremez.
4. **Veri İzolasyonu (Multi-Tenancy):**  
   MongoDB ve Qdrant sorgularında `tenant_id` filtresi zorunludur.

---

## 4. AI Çalışma Disiplini & Geliştirici Standartları

1. **Kıdemli Uzman Yaklaşımı & Modern Mühendislik:**  
   AI, çalıştığı her alanda kıdemli bir uzman (Senior/Staff Engineer) şapkasını takar; geçici ve acemice yamalar yerine modern, güvenli ve sürdürülebilir mühendislik uygular.
2. **Kullanıcı Direktiflerine Mutlak Saygı ve Uyum:**  
   Kullanıcının belirlediği gereksinimler, tercihler ve kısıtlamalar birincil kuraldır. Kullanıcı iradesini baypas eden keyfi adımlar atılamaz; belirsizlikte soru sorularak hizalanılır.
3. **Şeffaf İletişim ("Ne Yapıldı ve Neden Yapıldı"):**  
   Sadece kod sunulmaz; yapılan geliştirmeler, arkasındaki mimari gerekçeler ve "neden bu şekilde yapıldığı" kullanıcıya net ve doyurucu biçimde açıklanır.
4. **Token Tasarrufu & 5-Adım Hata Döngüsü Kuralı (Anti-Loop):**  
   Token verimliliği esastır. Bir hata **en fazla 5 denemede** çözülemediğinde inatlaşma derhal durdurulur; kök neden analizi ve denenen yollar özetlenerek kullanıcıdan destek istenir.
5. **Mantık Odaklı ve Pragmatik Test Yaklaşımı:**  
   Mimari test edilebilir tasarlanır; çekirdek domain mantığı, yetkilendirme ve çok kiracılı veri izolasyonu (Multi-Tenancy) test edilir. Ancak en küçük UI veya önemsiz detay için anlamsız testler yazarak proje hantallaştırılmaz.
6. **Çift Odaklı ve Yaşayan Dökümantasyon Kültürü:**  
   Dökümantasyon her zaman güncel tutulur. İnsanlar için detaylı ve görsel (`documents/human/`), AI'lar için net ve amaca yönelik (`documents/ai_context/`) belgeler güncellenir veya gerekirse yenileri oluşturulur.
   *(Ayrıntılı yönergeler için: [DEVELOPMENT_GUIDELINES.md](documents/ai_context/DEVELOPMENT_GUIDELINES.md))*


