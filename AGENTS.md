# AGENTS.md — AI Agent Guidance & Context Directory

> **DİKKAT (TÜM AI AJANLARI İÇİN):**  
> Bu dosya, projede çalışacak tüm yapay zeka modelleri ve kodlama asistanları (Antigravity, Gemini, Claude, Cursor vb.) için tek ve merkezi referans kılavuzudur.  
> Proje, **1 Ortak Çatı + 3 Bağımsız Alt Proje** (`backend`, `admin-interface`, `user-interface`) içeren bir Monorepo mimarisindedir.  
> Herhangi bir kod yazmadan veya mimari değişiklik yapmadan önce aşağıdaki kurallara ve ilgili alt projenin `documents/ai_context/` altındaki kurallarına harfiyen uyunuz.

---

## 1. Proje Kimliği ve Temel Vizyon

- **Proje Adı:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_)
- **Dağıtım Modeli:** Self-Hosted / On-Premises (Müşteri veya kurum sunucularında yerel kurulum)
- **Ana Hedef:** Kurumların yerel LLM'leri (Ollama, vLLM) ve bulut modellerini (OpenAI, Anthropic) tek bir gateway üzerinden yönetmesi, RAG destekli bilgi bankası sorgulaması yapması ve esnek RBAC ile yetkilendirmesi.
- **Alt Projeler:**
  1. `apps/backend`: Node.js, Express, Modüler Monolit, RAG, Qdrant, BullMQ, Vercel AI SDK.
  2. `apps/admin-interface`: React, TypeScript, Tailwind, Model/Tenant/Kullanıcı Yönetim Paneli.
  3. `apps/user-interface`: React, TypeScript, Tailwind, Sohbet, SSE Streaming, RAG Çekmecesi, Kıyaslama.

---

## 2. Bilgi Bankası (Knowledge Base) Navigasyonu

### A. Ortak & Sistem Belgeleri (Tüm Proje)
- [documents/ai_context/SYSTEM_CONTEXT.md](documents/ai_context/SYSTEM_CONTEXT.md): Monorepo haritası ve anlık durum raporu.
- [documents/ai_context/COMMON_GUIDELINES.md](documents/ai_context/COMMON_GUIDELINES.md): AI çalışma prensipleri, 5-adım anti-loop, test & SonarQube standartları.
- [documents/common/prd.md](documents/common/prd.md): Ürün Gereksinimleri Belgesi (PRD v2.1.0).
- [documents/common/design_system_and_tokens.md](documents/common/design_system_and_tokens.md): "Nexus Precision" Tasarım Sistemi ve token'lar.
- [documents/common/data_and_business_workflows.md](documents/common/data_and_business_workflows.md): MongoDB ERD, Qdrant şeması ve Sequence diyagramları.
- [documents/openapi.json](documents/openapi.json): Canlı OpenAPI 3.0 REST API spesifikasyonu.
- [documents/stitch_design_preview.html](documents/stitch_design_preview.html): Canlı interaktif tasarım prototipi.

### B. Alt Proje Özel Belgeleri (Agent Traffic Controller)

| Çalıştığınız Alt Proje | Zorunlu AI Kural Dosyası | Detaylı Mimari & Şartname Dosyaları |
| :--- | :--- | :--- |
| **`apps/backend`** | [documents/ai_context/BACKEND_RULES.md](documents/ai_context/BACKEND_RULES.md) | [documents/backend/architecture.md](documents/backend/architecture.md) |
| **`apps/admin-interface`** | [documents/ai_context/ADMIN_INTERFACE_RULES.md](documents/ai_context/ADMIN_INTERFACE_RULES.md) | [documents/admin-interface/architecture_and_screens.md](documents/admin-interface/architecture_and_screens.md)<br/>[documents/admin-interface/model_and_tenant_management.md](documents/admin-interface/model_and_tenant_management.md)<br/>[documents/admin-interface/admin_ui_conventions.md](documents/admin-interface/admin_ui_conventions.md) |
| **`apps/user-interface`** | [documents/ai_context/USER_INTERFACE_RULES.md](documents/ai_context/USER_INTERFACE_RULES.md) | [documents/user-interface/architecture_and_chat_flows.md](documents/user-interface/architecture_and_chat_flows.md)<br/>[documents/user-interface/rag_drawer_and_prompt_ui.md](documents/user-interface/rag_drawer_and_prompt_ui.md)<br/>[documents/user-interface/user_ui_conventions.md](documents/user-interface/user_ui_conventions.md) |

---

## 3. Asla İhlal Edilmeyecek Kritik Kurallar (Non-Negotiable Constraints)

1. **Minimum Dış Bağımlılık (Zero/Low Dependency):**  
   React arayüzlerinde (`admin-interface` ve `user-interface`) gereksiz npm paketleri (ağır Radix, MUI, AntD, AG-Grid vb.) YASAKTIR.  
   Modal, Drawer, Dropdown, Collapsible, Tabs ve Table bileşenleri projenin kendi kaynak kodunda saf React + Tailwind ile yazılacaktır.
2. **Tema ve Renk Mimarisi:**
   - Sistem teması (`prefers-color-scheme`) varsayılandır.
   - Tespit edilemezse fallback: **Aydınlık (Light) Tema**.
   - Renk paletleri ana sohbet ekranında değil, **Görünüm Ayarları Modalı** içinde "derinde" yer alır.
3. **Backend Modüler Monolit (Modular Monolith) & Katı İzolasyon:**  
   Klasik Clean Architecture yerine iş alanlarına (Bounded Contexts) göre ayrılmış Modüler Monolit yapısı esastır. Modüller birbirlerinin veritabanı modellerine/koleksiyonlarına doğrudan erişemez; iletişim yalnızca modülün kamuya açık public arayüzü (`index.ts` / Facade) üzerinden gerçekleşir.
4. **Veri İzolasyonu (Multi-Tenancy):**  
   MongoDB ve Qdrant sorgularında `tenant_id` filtresi zorunludur.
5. **Admin Model Yönetimi:**  
   Sistemde hiçbir yerde (kod, şema, env) sabit kodlanmış (hardcoded) varsayılan model bulunamaz. Modelleri ve varsayılan modeli yalnızca Admin belirler; kullanıcı model seçmek zorundadır.
6. **Çok Katmanlı Dinamik Prompt Mimarisi (Prompt Stacking):**  
   Sistem promptları oturum içine gömülü statik metin olamaz; kurumsal guardrail, rol personasi ve kullanıcı talimatları anlık derlenir. Prompt güncellemeleri deploy gerekmeksizin ilk mesajda anında yürürlüğe girer.
7. **Canlı OpenAPI Dokümantasyonu:**  
   Tüm REST API uç noktaları Zod DTO şemaları ile tip güvenli OpenAPI spesifikasyonuna bağlanmalı ve `documents/openapi.json` daima güncel tutulmalıdır.
8. **Veritabanı Şemaları & İş Akışları Dokümantasyonu (Living ERD & Workflows):**  
   Veritabanı koleksiyonlarında (MongoDB Mongoose şemaları), Qdrant vektör payload yapılarında veya temel iş akışlarında (Prompt Stacking, RAG pipeline vb.) yapılan her değişiklik, anında `documents/common/data_and_business_workflows.md` dosyasındaki Mermaid ERD ve sequence diyagramlarına yansıtılmalıdır. Dokümantasyonu güncellenmemiş şema ve akış değişiklikleri tamamlanmış sayılamaz.
9. **SonarQube Kalite ve Güvenlik Standartları (Clean Code & Security Gate Compliance):**  
   Tüm kod geliştirmelerinde SonarQube MCP entegrasyonu ve kalite standartları (Clean Code taksonomisi, Security Hotspots, OWASP uyumluluğu, sıfır kritik güvenlik açığı/vulnerability, düşük bilişsel karmaşıklık ve sıfır code smell) dikkate alınır. Geliştirilen her parça SonarQube kurallarına tam uyumlu olarak yazılır ve onaylanmış kalite kapısı (Quality Gate: Sonar way) standartları korunur.
10. **Standart Node.js Subpath Imports (#*) Mimarisi (Native ESM Specifier):**  
    Dosya ve modül erişimlerinde (import/export) Node.js ve ECMAScript standart subpath import tanımlayıcıları (`#modules/*`, `#shared/*`, `#config/*`, `#*`) zorunlu olarak kullanılır. Derin göreceli/relatif yollar (`../../`, `../../../`) dizin düzeni güncellendiğinde tüm dosya yollarının kırılmasına ve gereksiz bakım maliyetine yol açacağından yasaktır. `package.json` içerisindeki `"imports"` haritası ve `tsconfig.json` altındaki `"paths"` eşlemesi sayesinde harici bir derleme sonrası betiğe (regex / resolve-aliases) ihtiyaç kalmadan hem geliştirme (`tsx`/`vitest`), hem IDE, hem de üretimde (native Node ESM) sıfır runtime overhead ile kusursuz modül çözünürlüğü garanti edilir.

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
   Dökümantasyon her zaman güncel tutulur. İnsanlar için detaylı ve görsel (`documents/common/`, `documents/backend/`, `documents/admin-interface/`, `documents/user-interface/`), AI'lar için net ve amaca yönelik (`documents/ai_context/`) belgeler güncellenir veya gerekirse yenileri oluşturulur.
7. **Adım Adım, Parça Parça ve İstişareli Geliştirme (Iterative Collaborative Engineering):**  
   Büyük kod blokları veya çoklu katmanlar asla tek seferde ve tek taraflı varsayımlarla yazılamaz. Her geliştirme adımı öncesinde kullanıcı ile mimari yöntem, kapsam ve uygulanacak parçalar istişare edilir; kullanıcının teyidi ve onayı alındıktan sonra adım adım, parça parça kodlanır ve doğrulanır.  
   _(Ayrıntılı yönergeler için: [COMMON_GUIDELINES.md](documents/ai_context/COMMON_GUIDELINES.md))_
8. **Zengin Kod İçi Yorum ve Tasarım Deseni Dokümantasyonu (Rich In-Code Comments & Design Patterns):**  
   Kod yazarken açıklayıcı ve öğretici yorum eklemeye azami özen gösterilir. Özellikle Factory, Registry, Adapter, Strategy, Pipeline gibi tasarım desenleri (design patterns) barındıran veya doğası gereği karmaşık/genişletilebilir olan mimari bileşenlerde; sınıfın ve metodların amacı, tasarım deseni rolü, `@param`, `@returns`, `@throws` etiketleri ve pratik kullanım örnekleri (`@example`) içeren kapsamlı JSDoc blokları zorunludur. Kod yalnızca çalışan bir mantık değil, onu okuyan ve genişleten geliştiriciler için yaşayan bir teknik rehber olmalıdır.

