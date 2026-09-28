# DEVELOPMENT_GUIDELINES.md — AI & Geliştirici Çalışma Prensipleri

> **HEDEF KİTLE:** Yapay Zeka Kodlama Ajanları (Antigravity, Gemini, Claude, Cursor vb.) ve İnsan Geliştiriciler  
> **AMAÇ:** Projede kod üretimi, iletişim, problem çözme, test pratikleri, token verimliliği ve dökümantasyon yaşam döngüsünde uyulması gereken operasyonel ve zihinsel standartları belirlemek.

---

## 1. Rol ve Uzmanlık Şapkası (Domain Expertise & Modern Engineering)

1. **Kıdemli Uzman Yaklaşımı (Senior/Staff Engineer Mindset):**
   - Yapay zeka, çalıştığı her alt görevde (B2B SaaS mimarisi, Clean Architecture, React bileşenleri, RAG boru hatları, veri güvenliği vb.) o alanın kıdemli uzmanı şapkasını takmalıdır.
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
   - Yazılan kod baştan test edilebilir olmalıdır (Clean Architecture prensipleri, Dependency Injection, gevşek bağlılık, saf domain fonksiyonları).
2. **Kritik Katmanlarda Zorunlu Test:**
   - Aşağıdaki kritik alanlar için gerekli testler yazılmalı ve doğrulanmalıdır:
     * Çekirdek Domain Mantığı ve İş Kuralları,
     * Güvenlik, Kimlik Doğrulama ve Çok Kiracılı Veri İzolasyonu (Multi-Tenancy & RLS),
     * Kritik API uç noktaları ve veri bütünlüğü.
3. **Aşırı ve Dogmatik Testçilikten Kaçınma:**
   - En ufak stil değişikliği, basit UI render'ı veya önemsiz getter/setter için bile anlamsız test yazarak projeyi yavaşlatma ve şişirme aşırılığına kaçılmamalıdır.
   - Test yazımında mantık, etki değeri ve yatırım getirisi (ROI) gözetilmelidir.

---

## 6. Yaşayan Çift Odaklı Bilgi Bankası (Dual-Target Living Documentation)

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

## 7. Dökümantasyon Yaşam Döngüsü ve Güncelleme Tetikleyicileri

Her geliştirme sürecinde aşağıdaki kurallar işletilmelidir:
1. **Mimari / Model Değişikliği:** Yeni bir modül, veritabanı şeması veya servis eklendiğinde `documents/ai_context/ARCHITECTURE_RULES.md` ve gerekirse `documents/human/software_architecture.md` güncellenmelidir.
2. **Arayüz / Tasarım Değişikliği:** Yeni bir ekran veya tasarım kararı onaylandığında `documents/ai_context/UI_FRONTEND_CONVENTIONS.md` ve `documents/human/ui_ux_specification.md` güncellenmelidir.
3. **Proje Durum Değişikliği:** Tamamlanan fazlar ve yeni odak noktaları `documents/ai_context/SYSTEM_CONTEXT.md` dosyasına işlenmelidir.
4. **Yeni İhtiyaçlar:** Gerek görüldüğünde ilgili kategori altına yeni dökümantasyon dosyaları açılmalı ve `documents/README.md` kataloguna kaydedilmelidir.
