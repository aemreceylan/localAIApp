# ADMIN MODEL, TENANT VE KULLANICI YÖNETİMİ SPESİFİKASYONU

> **DOKÜMAN TİPİ:** Alt Proje İş Mantığı ve Yetkilendirme Rehberi (`apps/admin-interface`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_Chotonack AI — Gateway & Knowledge Base_)  
> **İlişkili Dokümanlar:** [Ortak PRD v2.1.0](../common/prd.md), [Backend Mimarisi](../backend/architecture.md), [Veritabanı Şemaları](../common/data_and_business_workflows.md)  

---

## 1. Admin Model Yönetimi ve Hardcoded Model Yasağı (Kural 5)

Platformun en kritik kurallarından biri: **Sistemde hiçbir yerde (kod, DB şeması, .env) sabit kodlanmış (hardcoded) varsayılan model bulunamaz.**

### 1.1. Yönetici Yetkisindeki Model Tanımları

1. **Model Sağlayıcı Ekleme / Düzenleme:**
   - Yerel sağlayıcılar: Ollama ve vLLM bağlantı adresleri, portları ve çalışma parametreleri.
   - Bulut sağlayıcıları: OpenAI, Anthropic API anahtarları, model katsayıları ve token maliyetleri.
2. **İzinli Modeller Havuzu (`allowed_models`):**
   - Kurumdaki kullanıcıların seçebileceği modeller listesi Admin paneli üzerinden onaylanır.
   - İzin verilmeyen bir model son kullanıcı arayüzünde görünmez ve API seviyesinde engellenir.
3. **Varsayılan Model Belirleme (`default_model`):**
   - Admin, kurum veya departman için "varsayılan önerilen model" belirleyebilir. Ancak bu bir statik kod değeri değil, veritabanından dinamik okunan bir yapılandırmadır.
   - Kullanıcı dilerse izinli modeller listesinden başka bir modeli seçerek sohbeti başlatabilir.

---

## 2. Lokal Model İndirme Yöneticisi (Ollama Engine Pull)

Admin panelinde, yerel sunucuda çalışan servisler için açık kaynak modelleri yönetme mekanizması:

1. **Model Kataloğu ve Tarama:**
   - Ollama / vLLM kütüphanesindeki modeller (örn: `llama3.3:70b`, `qwen2.5-coder:32b`, `mistral:7b`) arayüz üzerinden listelenir.
2. **Kaynak ve Disk Güvenlik Kontrolü:**
   - İndirme tetiklenmeden önce sunucu disk boşluğu kontrol edilir. Doluluk oranı %85 üzerindeyse indirme başlatılamaz.
3. **İlerleme (Progress) Takibi:**
   - Backend'den gelen SSE akışı üzerinden anlık indirme yüzdesi, kalan süre ve transfer hızı (MB/s) ekrandaki ilerleme çubuğuna yansıtılır.
4. **İndirme Yaşam Döngüsü Aksiyonları:**
   - İndirme devam ederken *Duraklat* veya *İptal Et* komutları verilebilir.
   - İptal edilen işlemlerde sunucuda geçici dosya temizliği otomatik yapılır.

---

## 3. Esnek RBAC ve Kullanıcı Onboarding Yönetimi

### 3.1. Ana Şablonlar ve Türetilmiş Roller

Sistem iki temel rol şablonuna dayanır:
- **`Admin` (Yönetici):** Altyapı, model, veri ve kullanıcı yönetim yetkileri.
- **`User` (Kullanıcı):** Sohbet, RAG sorgulama ve izinli modelleri kullanma yetkileri.

**Türetilmiş Roller:**
- Adminler bu iki ana şablonu temel alarak özel departman rolleri üretebilir (_Örn: "Hukuk Müşavirliği", "Stajyer", "Veri Analitiği"_).
- Bir rol oluşturulurken hangi modellerin ve hangi bilgi bankası klasörlerinin erişilebilir olduğu tanımlanır.

### 3.2. Kullanıcı Bazlı Yetki Ezme (User-level Overrides)

- Kullanıcının rolü ne olursa olsun, Admin doğrudan o kullanıcı özelinde kural tanımlayabilir:
  - Belirli bir modeli yalnızca o kullanıcıya açma/kapatma.
  - Kullanıcı bazlı günlük/aylık token limitini artırma veya kısıtlama.

### 3.3. Kayıt ve Onboarding Akışları

Admin panelinde iki kayıt mekanizmasının yönetimi sağlanır:
1. **Davet Bağlantıları / Kayıt Kodları:**
   - Admin tek tıkla belirli bir role veya departmana atanmış süreli davet linki üretir (`nx_inv_*`).
   - Bağlantıyı kullanan kişi doğrudan aktif kullanıcı olarak sisteme dahil olur.
2. **Açık Kayıt Onay Havuzu:**
   - Kendi kendine kayıt olan personeller *"Onay Bekliyor"* listesine düşer (`status: pending_approval`).
   - Admin tek tıkla hesabı onaylar, rolünü atar veya başvuruyu gerekçe belirterek reddeder.

### 3.4. Rol Delegasyonu ve Granüler Yetkilendirme Prensipleri

1. **Admin Rol Atama Yetkisi:**
   - `admin:user:assign_role` iznine sahip bir yönetici, sistemde kayıtlı herhangi bir rolü (admin arketipinde olanlar dahil) diğer kullanıcılara atayabilir.
2. **Arketip Türetimi ve İzin İzolasyonu:**
   - Bir rolün `base_archetype: 'admin'` olarak tanımlanmış olması, o rolden türetilen personelin otomatik olarak kullanıcı veya yönetici atama yetkisine sahip olmasını gerektirmez.
   - Her rol, yalnızca izinler dizisinde (`permissions`) açıkça belirtilen yetkileri kullanabilir. Örneğin yalnızca RAG dokümanlarını yönetmek üzere türetilmiş bir `rag_manager` rolüne `admin:user:assign_role` izni verilmezse, o yönetici başka bir kullanıcıya rol atayamaz veya yetki yükseltemez.
3. **Kullanıcı Bazlı Yetki İstisnaları (Override) Güvenliği:**
   - `admin:user:override` yetkisine sahip yönetici, hedef kullanıcıların rollerindeki izinleri ezebilir (`allow`/`deny`).
   - **Öz-Yetkilendirme (Self-Escalation) Engeli:** Bir yönetici kendi hesabına doğrudan `allow` listesiyle yeni yetki ekleyemez (403 Forbidden). Yetki artışları her zaman başka bir yetkili yönetici tarafından yapılmalıdır.
