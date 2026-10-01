# DEVELOPMENT_GUIDELINES.md — AI & Geliştirici Çalışma Prensipleri

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (Antigravity, Gemini, Claude, Cursor vb.) ve İnsan Geliştiriciler  
> **AMAÇ:** Projede kod üretimi, iletişim, problem çözme, test pratikleri, token verimliliği ve dökümantasyon yaşam döngüsünde uyulması gereken operasyonel ve zihinsel standartları belirlemek.

---

## 1. Rol ve Uzmanlık Şapkası (Domain Expertise & Modern Engineering)

1. **Kıdemli Uzman Yaklaşımı (Senior/Staff Engineer Mindset):**
   - Yapay zeka, çalıştığı her alt görevde (B2B SaaS mimarisi, Modüler Monolit (Modular Monolith) mimarisi, React bileşenleri, RAG boru hatları, veri güvenliği vb.) o alanın kıdemli uzmanı şapkasını takmalıdır.
   - Geliştirmeler; acemice, aceleye getirilmiş veya geçici "hack" çözümler yerine endüstri standardı en iyi uygulamalar (best practices), tip güvenliği ve sürdürülebilirlik ilkeleri gözetilerek yapılmalıdır.
2. **Modern ve Akıllıca Mühendislik:**
   - Eskimiş kalıplar ve hantal kütüphaneler yerine modern web ve backend standartları (TypeScript strict mode, native Web API'ler, saf Tailwind pratikleri, modüler mimari) tercih edilmelidir.
   - Her teknik karar ölçeklenebilirlik, performans ve bakım kolaylığı açısından değerlendirilmelidir.

---

## 2. Kullanıcı İsteklerine Mutlak Saygı ve Uyum (Respect for User Intent)

1. **Direktiflere Koşulsuz Bağlılık:**
   - Kullanıcının açıkça belirttiği tercihler, tasarım kararları, mimari kısıtlamalar ve iş kuralları birincil önceliktir.
   - Kullanıcının reddettiği kütüphaneler (ör. harici UI paketleri) veya benimsediği tasarım kuralları (ör. sistem teması varsayılanı, RLS zorunluluğu) asla keyfi biçimde delinemez.
2. **Varsayımlar Yerine Hizalama:**
   - Bir gereksinim veya tasarım tercihi net değilse, rastgele varsayımlar üretmek yerine soru sorarak kullanıcı ile hizalanmalıdır.
3. **Adım Adım, Parça Parça ve İstişareli Geliştirme (Iterative Collaborative Engineering):**
   - Kodlama süreçlerinde devasa ve kontrolsüz kod blokları bir defada üretilmez.
   - Her yeni katman, modül veya mimari parça geliştirilmeden önce kullanıcı ile istişare edilir; yöntem, kapsam ve plan netleştirilir.
   - Kullanıcı onayı alındıktan sonra parça parça kodlanır, test edilerek doğrulanır ve bir sonraki adım için tekrar istişare edilir.

---

## 3. Şeffaf İletişim: "Ne Yapıldı ve Neden Yapıldı" İlkesi

1. **Gerekçelendirilmiş Açıklamalar:**
   - Yalnızca "şu dosya değiştirildi" şeklinde kuru bilgi verilmemelidir.
   - Ne yapıldığı, **hangi teknik ve mimari gerekçeyle (neden)** yapıldığı, alternatifler arasından neden bu yolun seçildiği kullanıcıya akıcı, net ve anlaşılır biçimde aktarılmalıdır.
2. **Kritik Kararların Kayıt Altına Alınması:**
   - Kodlama esnasında alınan kritik mimari ve tasarım kararları doğrudan dökümantasyona işlenmelidir.

---

## 4. Token Verimliliği ve 5-Adım Hata Döngüsü Kuralı (Anti-Loop Protocol)

1. **Bilinçli Token Tüketimi:**
   - Gereksiz devasa dosya okumalarından, kontrolsüz terminal log çıktılarından ve gereksiz tekrarlardan kaçınılmalıdır.
   - Kod değişiklikleri hedeflenmiş ve odaklı tutulmalıdır.
2. **5-Adım Hata Döngüsü (Anti-Loop & Escalation):**
   - Bir derleme, çalıştırma, test veya kodlama hatası ile karşılaşıldığında; sonsuz deneme-yanılma ve düzeltme döngüsüne girilmesi KESİNLİKLE YASAKTIR.
   - **Kural:** Eğer bir hata **en fazla 5 denemede** çözülemiyorsa veya çözüm belirsizleşiyorsa:
     1. İnatlaşma ve otomatik denemeler derhal durdurulur.
     2. Kullanıcıya net bir durum raporu sunulur:
        - Alınan hatanın tam özeti ve kök neden analizi,
        - Yapılan 5 denemenin ve sonuçlarının özeti,
        - Olası alternatif çözüm yolları veya ihtiyaç duyulan kullanıcı kararı/müdahalesi.
     3. Kullanıcıdan onay veya yönlendirme alınmadan yeni bir deneme döngüsüne girilmez.

---

## 5. Pragmatik ve Mantık Odaklı Test Stratejisi (Pragmatic Testing)

1. **Test Edilebilir Mimari:**
   - Yazılan kod baştan test edilebilir olmalıdır (Modüler Monolit prensipleri, gevşek bağlılık, bağımsız servis ve repository katmanları, saf fonksiyonlar).
2. **Kritik Katmanlarda Zorunlu Test:**
   - Aşağıdaki kritik alanlar için gerekli testler yazılmalı ve doğrulanmalıdır:
     - Çekirdek Domain Mantığı ve İş Kuralları,
     - Güvenlik, Kimlik Doğrulama ve Çok Kiracılı Veri İzolasyonu (Multi-Tenancy & RLS),
     - Kritik API uç noktaları ve veri bütünlüğü.
3. **Aşırı ve Dogmatik Testçilikten Kaçınma:**
   - En ufak stil değişikliği, basit UI render'ı veya önemsiz getter/setter için bile anlamsız test yazarak projeyi yavaşlatma ve şişirme aşırılığına kaçılmamalıdır.
    - Test yazımında mantık, etki değeri ve yatırım getirisi (ROI) gözetilmelidir.

---

## 6. SonarQube Paralelinde Temiz Kod ve Güvenlik Standartları (Clean as You Code)

1. **Clean as You Code (CaYC) Prensibi:**
   - Yeni yazılan veya değiştirilen her kod satırı SonarQube standartlarına göre temiz, okunabilir, tip güvenli ve güvenli olmalıdır.
   - Projenin varsayılan kalite kapısı olan **"Sonar way"** kriterlerine (sıfır yeni açık, sıfır security hotspot, kabul edilebilir bilişsel karmaşıklık, sıfır code smell) mutlak uyum sağlanmalıdır.
2. **Güvenlik ve Zafiyet Önleme (Security & OWASP Top 10):**
   - Kod geliştirilirken SQL/NoSQL Injection, güvensiz deserialization, hardcoded secrets/API keys/token'lar, Path Traversal, ReDoS ve SSRF gibi yaygın zafiyet kalıplarından kesinlikle kaçınılmalıdır.
   - SonarQube'un `Security Hotspot` olarak işaretleyebileceği kriptografik, oturum ve yetkilendirme mantıkları dikkatle kurgulanmalıdır.
3. **Bilişsel Karmaşıklık ve Bakım Kolaylığı (Cognitive Complexity & Maintainability):**
   - Fonksiyonlar tek bir amaca hizmet etmeli (Single Responsibility), aşırı iç içe geçmiş (deeply nested) döngü ve koşul bloklarından kaçınılmalıdır.
   - Bilişsel karmaşıklık (Cognitive Complexity) düşük tutulmalı, kod tekrarlarından (duplication) kaçınılmalı ve gereksiz/ölü kod (dead code) bırakılmamalıdır.
4. **SonarQube MCP Araçlarının Aktif Kullanımı:**
   - Kodlama esnasında veya şüpheli modüllerde `analyze_code_snippet`, `search_sonar_issues_in_projects` ve `get_project_quality_gate_status` MCP araçları ile kontroller gerçekleştirilir.
   - Tespit edilen kod kokuları (code smells) veya güvenlik uyarıları derhal refactor edilerek kod temizliği garanti altına alınır.
5. **Refactoring Güvenliği ve Path Aliases:**
   - Kodlama esnasında göreceli/relatif dosya yolları (`../../`, `../../../`) yerine `tsconfig.json` içinde yapılandırılmış olan path alias'lar (`@/config/*`, `@/modules/*`, `@/shared/*`, `@/*`) zorunlu olarak kullanılır.
   - Bu sayede dosya düzeni veya klasör yapısı güncellendiğinde tüm import yollarının kırılması ve manuel olarak güncellenmesi riski tamamen ortadan kalkar.

---

## 7. Yaşayan Çift Odaklı Bilgi Bankası (Dual-Target Living Documentation)

Dökümantasyon statik bir arşiv değil, projenin anlık gerçeğini yansıtan yaşayan bir sistemdir (Single Source of Truth). Dökümantasyon daima iki ayrı hedef kitleye göre ayrıştırılmış olarak sürdürülmelidir:

### A. İnsan Odaklı Dökümantasyon (`documents/human/`)

- **Hedef:** Yazılım mühendisleri, mimarlar, ürün yöneticileri, paydaşlar.
- **Odak:** Kapsamlı PRD gereksinimleri, sistem mimarisi şemaları (SAD), UI/UX ekran akışları, tasarım sistemi token kılavuzları ve iş gerekçeleri.
- **Üslup:** Detaylı, görsel, yapısal ve bağlamsal anlatım.

### B. AI Odaklı Dökümantasyon (`documents/ai_context/` ve `AGENTS.md`)

- **Hedef:** Yapay zeka ajanları (Antigravity, Cursor, Claude vb.).
- **Odak:** Yüksek sinyal/gürültü oranı (high signal-to-noise), kurallar, kısıtlamalar, dizin haritaları, durum özetleri ve bağlam dosyaları.
- **Üslup:** Doğrudan, maddeli, amaca yönelik, net ve bağlayıcı kurallar.

---

## 8. Dökümantasyon Yaşam Döngüsü ve Güncelleme Tetikleyicileri

Her geliştirme sürecinde aşağıdaki kurallar işletilmelidir:

1. **Mimari / Model Değişikliği:** Yeni bir modül, veritabanı şeması veya servis eklendiğinde/değiştirildiğinde `documents/ai_context/ARCHITECTURE_RULES.md`, `documents/human/data_and_business_workflows.md` (Mermaid ERD ve iş akış şemaları) ve gerekirse `documents/human/software_architecture.md` güncellenmelidir.
2. **Arayüz / Tasarım Değişikliği:** Yeni bir ekran veya tasarım kararı onaylandığında `documents/ai_context/UI_FRONTEND_CONVENTIONS.md` ve `documents/human/ui_ux_specification.md` güncellenmelidir.
3. **Proje Durum Değişikliği:** Tamamlanan fazlar ve yeni odak noktaları `documents/ai_context/SYSTEM_CONTEXT.md` dosyasına işlenmelidir.
4. **Yeni İhtiyaçlar:** Gerek görüldüğünde ilgili kategori altına yeni dökümantasyon dosyaları açılmalı ve `documents/README.md` kataloguna kaydedilmelidir.
5. **Proaktif ve Kendiliğinden Güncelleme İlkesi (Autonomous Living Documentation):**
   - AI ajanı, kodda veya mimaride yapılan değişikliklerin dokümantasyon yansımasını **kullanıcının hatırlatmasına gerek kalmadan kendiliğinden akıl etmeli ve proaktif olarak güncellemelidir.**
   - Model şeması veya DTO değişikliklerinde `documents/openapi.json` spesifikasyonunun ve `documents/human/data_and_business_workflows.md` (ERD ve akış şemaları) dosyasının güncellendiğini doğrulamalıdır.
   - Bir model, veri şeması veya iş kuralı değiştiğinde ilgili tüm insan ve AI odaklı dökümanlar aynı adımda güncellenmeden o geliştirme tamamlanmış sayılmaz.
