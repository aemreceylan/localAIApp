# ÜRÜN GEREKSİNİMLERİ BELGESİ (PRD) & İŞ ANALİZİ RAPORU

> **DOKÜMAN TİPİ:** Ortak Referans Belgesi (Tüm Monorepo: `backend`, `admin-interface`, `user-interface`)  
> **Proje Adı:** Kurumsal LLM & Veri Yönetim Platformu (_Chotonack AI — Gateway & Knowledge Base_)  
> **Dağıtım Modeli:** Self-Hosted / On-Premises (Tüzel veya Gerçek Kişi Tarafından Kendi Sunucularına Kurulur)  
> **Doküman Sürümü:** v2.1.0  
> **Rol:** AI Lead Product Manager & Business Analyst

---

## DOKÜMAN KÜNYESİ

- **Sistem Tipi:** Kendi sunucularında çalışan (Self-Hosted), uzaktan erişilebilir (_Remote-accessible_) Kurumsal Yapay Zeka ve RAG Platformu.
- **Temel İş Amacı:** Şirketlerin veya kişilerin, kendi belirledikleri LLM'leri (yerel modeller veya bulut API'leri) ve özel veri kaynaklarını tek bir güvenli arayüzden yönetebilmesi, yetkilendirmesi ve kullanabilmesi.

---

## 1. KULLANICI ROL VE YETKİLENDİRME MODELİ (ESNEK RBAC)

Platform, katı ve sabit roller yerine, ana şablonlardan türetilebilen ve kullanıcı bazında esnetilebilen bir rol-yetki mimarisine sahiptir.

### 1.1. Ana Rol Şablonları (Base Templates)

Sistemde iki temel ana rol şablonu bulunmaktadır. Sistemdeki her kullanıcının en az bir ana rolü (`Admin` veya `User`) olmak zorundadır.

- **Admin (Sistem Yöneticisi):** Sistem yapılandırması, model bağlantıları, veri kaynakları ve kullanıcı onaylarından sorumlu ana yetkili şablonu.
- **User (Kullanıcı):** Sohbet arayüzünü kullanma, yetkili olduğu modeller ve bilgi bankalarıyla etkileşime girme yetkisine sahip standart kullanıcı şablonu.

### 1.2. Türetilmiş Roller ve Doğrudan Yetkilendirme

- **Özel Rol Oluşturma:** Adminler, yalnızca bu ana şablonları (`Admin` veya `User`) temel alarak ihtiyaçlarına göre özel roller türetebilir (_Örn: Hukuk Departmanı, Stajyer, Veri Analisti_).
- **İsteğe Bağlı Rol Atama:** Kullanıcılara türetilmiş bir rol vermek zorunlu değildir; kullanıcı yalnızca ana rolüyle de kalabilir.
- **Kullanıcı Bazlı Yetki Esnetme (User-level Overrides):** Kullanıcının dahil olduğu rol ne olursa olsun, Admin tarafından doğrudan ilgili kullanıcı özelinde yetkiler daraltılabilir veya genişletilebilir.

### 1.3. Rol ve Yetki Kapsamı

- **Model Erişim Yetkileri:** Hangi kullanıcının veya rolün hangi LLM'leri (Yerel/Bulut) kullanabileceğinin belirlenmesi.
- **Veri Kaynağı Yetkileri:** Hangi kullanıcının hangi Bilgi Bankasına (_Knowledge Base_) erişebileceğinin tanımlanması.
- **Kota ve Limit Yönetimi:** Kullanıcı veya rol bazlı günlük/aylık token sınırları ve kullanım kotaları.

---

## 2. KULLANICI KAYIT VE ONBOARDING YÖNTEMLERİ

Pratik ve güvenli iki ana kayıt mekanizması desteklenecektir. Admin paneli üzerinden hangi yöntemlerin aktif olacağı seçilebilir:

1. **Davet Linki / Kayıt Kodu ile Onboarding:**
   - Admin sistem üzerinden tek kullanımlık veya süreli bir davet linki / kayıt kodu üretir.
   - Kullanıcı bu bağlantı/kod ile kendi hesap bilgilerini (E-posta, Parola, İsim vb.) oluşturarak doğrudan sisteme giriş yapabilir.

2. **Açık Kayıt + Admin Onay Akışı:**
   - Kullanıcı giriş ekranından kendi hesabını oluşturur.
   - Hesap _"Onay Bekliyor"_ durumuna geçer.
   - Admin panelinde hesabı onayladığı anda kullanıcı sisteme erişim kazanır.

---

## 3. KULLANICI ARAYÜZÜ (USER UI) İŞ GEREKSİNİMLERİ

### 3.1. Sohbet ve Etkileşim Ekranı

- **Odaklanabilir Tasarım:** Sade, minimalist ve sohbet merkezli kullanıcı deneyimi.
- **Model Seçimi:** Kullanıcının erişim yetkisine sahip olduğu LLM'ler arasında kolayca geçiş yapabilmesi.
- **Gerçek Zamanlı Yanıt (Streaming):** Kullanıcı mesajı gönderdiğinde yanıtın anlık olarak ekrana akması.
- **Çoklu Model Karşılaştırma (Side-by-Side Comparison):** Kullanıcının tek bir prompt'u aynı anda seçtiği iki farklı modele (ör. bir yerel model ile bir bulut model) gönderip yanıtları ekranı ikiye bölerek yan yana kıyaslayabilmesi.
- **Uzaktan Erişim Uyumluluğu:** Arayüzün farklı cihazlardan ve yerel ağ dışından sorunsuz çalışabilir responsive yapıda olması.

### 3.2. Sohbet Yönetimi, Paylaşım ve Geçmiş

- **Geçmiş Takibi:** Geçmiş sohbetlerin listelenmesi, aratılması, sabitlenmesi ve silinmesi.
- **Dallandırma ve Düzenleme:** Gönderilen mesajın düzenlenip yeni bir yanıt akışının başlatılabilmesi.
- **Sohbet Paylaşımı (Shareable Chat Links):** Kullanıcının bir sohbeti/analizi şirket içindeki diğer kullanıcılarla salt okunur bir bağlantı (link) üzerinden paylaşabilmesi.
- **Dışa Aktarma:** Sohbet geçmişinin metin veya standart doküman formatlarında indirilebilmesi.

### 3.3. Doküman ve Bilgi Bankası ile Çalışma

- **Anlık Doküman Analizi:** Sohbet penceresine doküman (PDF, TXT, DOCX vb.) yükleyerek sadece o doküman özelinde soru sorabilme.
- **Bilgi Bankası (Knowledge Base) Sorgulama:** Yönetim tarafından sisteme tanımlanmış kurumsal veri havuzlarının seçilerek RAG destekli yanıtlar alınması.
- **Kaynak Gösterimi (Citations):** Üretilen yanıtların hangi doküman parçalarına dayandığının kullanıcıya gösterilmesi.

### 3.4. Prompt Kütüphanesi ve Çok Katmanlı Dinamik Prompt Yönetimi (Prompt Stacking)

- **Şirket ve Kullanıcı Şablonları:** Sık kullanılan komutların hazır şablonlar halinde saklanabilmesi ve sohbet ekranında hızlıca çağrılabilmesi.
- **Çok Katmanlı Dinamik Birleştirme:** Kurumsal güvenlik kuralları (`system_guardrail`), uzmanlık personaları (`persona`) ve oturuma özel kullanıcı talimatlarının (`custom_instructions`) anlık olarak birleştirilmesi.
- **Gerçek Zamanlı Güncelleme:** Yöneticinin panelden güncellediği güvenlik ve persona promptları, yeni bir deploy gerekmeksizin sonraki ilk mesajda tüm oturumlara anında yansır.

---

## 4. YÖNETİCİ ARAYÜZÜ (ADMIN UI) İŞ GEREKSİNİMLERİ

### 4.1. Kullanıcı, Rol ve Onboarding Yönetimi

- Kullanıcı listesi, hesap onaylama/reddetme ve dondurma işlemleri.
- **Rol Yönetimi:** Yeni roller ancak ve ancak ana şablonlardan (`Admin` veya `User`) türetilebilir. Özel roller tanımlama, yetki matrislerini düzenleme ve kullanıcı özelinde yetki ezme (_override_) işlemleri.
- Davet linki / Kayıt kodu üretme ve yönetme ekranı.

### 4.2. LLM Sağlayıcı ve Model Yönetimi

- **Default ve Seçilebilir Model Yetkilendirmesi:** Sistemde hiçbir yerde (kod, DB şeması, env) sabit kodlanmış (hardcoded) varsayılan model bulunmaz. Kullanıcıların seçebileceği modeller listesini ve varsayılan önerilen modeli yalnızca Admin belirler. Model seçilmeden oturum başlatılamaz.
- Yerel LLM bağlantı adresi ve parametrelerinin tanımlanması (Ollama, vLLM vb.).
- Bulut LLM API anahtarlarının ve model parametrelerinin yönetimi.
- **Lokal Model İndirme Yöneticisi:** Admin panelinde, yerel sunucuda çalışan servisler (Ollama vb.) için yeni açık kaynak modellerin doğrudan arayüz üzerinden taranıp tek tıkla sunucuya indirilmesini ve kullanıma hazır hale getirilmesini sağlayan yönetim modülü.
- Model bazlı maliyet ve token katsayılarının tanımlanması.

### 4.3. Veri Kaynakları ve RAG Yönetimi

- Kurumsal dokümanların ve veri kaynaklarının sisteme yüklenmesi/bağlanması.
- İndeksleme durumlarının (_Tamamlandı, Hata, İşleniyor_) takibi.

### 4.4. Kullanım Denetimi (Audit Logs) & Raporlama

- Kimin, ne zaman, hangi modeli kullandığı ve ne kadar token tükettiği bilgilerinin izlenmesi.
- Departman, kullanıcı ve model bazlı kullanım metrikleri.

---

## 5. VERİ GÜVENLİĞİ VE HASSAS VERİ POLİTİKASI

Platform, kurumların ve kişilerin doğrudan hassas veriler (hukuk sözleşmeleri, İK belgeleri, finansal analizler) üzerinde LLM çalıştırmasına olanak tanıyacak esneklikte tasarlanmıştır.

- **Yapılandırılabilir Veri Gizliliği:** Veri gizliliği ve maskeleme kuralları Admin kontrolünde ve isteğe bağlı (_opt-in_) olarak yapılandırılır.
- **Dinamik Veri İşleme:** LLM'lerin ham veriye tam erişim sağlaması gereken senaryolarda varsayılan olarak veri kısıtlamasız işlenir. İhtiyaç duyulması halinde belirli veri kaynakları, departmanlar veya modeller özelinde veri maskeleme/filtreleme kuralları aktif edilebilir.

---

## 6. MoSCoW METODOLOJİSİ İLE MVP VE FAZLANDIRMA ANALİZİ

```
+-----------------------------------------------------------------------+
| MUST HAVE (MVP - İlk Sürümde Olmazsa Olmazlar)                        |
| - Self-Hosted Kurulum & Uzaktan Erişim Desteği                        |
| - Ana Rol Şablonları (Admin, User) ve Temel Rol/Yetki Yönetimi        |
| - Davet Linki ve Açık Kayıt + Admin Onayı Yöntemleri                  |
| - Temel Chat UI & Anlık Yanıt Akışı                                   |
| - Yerel (Ollama/vLLM) ve Bulut API Bağlantıları                       |
| - Anlık Doküman Yükleme & Temel RAG (Bilgi Bankası) Sorgulama         |
| - Canlı OpenAPI 3.0 API Dokümantasyonu (Swagger UI & JSON)            |
| - Temel Audit Logları (Kim, ne zaman, kaç token harcadı?)             |
+-----------------------------------------------------------------------+
                                   │
                                   ▼
+-----------------------------------------------------------------------+
| SHOULD HAVE (Faz 2 - İlk Güncellemede Eklenmesi Gerekenler)           |
| - Çok Katmanlı Dinamik Prompt Stacking Motoru (Guardrail & Persona)   |
| - Admin Model Yönetimi (Hardcoded Model Yasağı & İzinli Modeller)     |
| - Ana Şablonlardan Özel Rol Türetme & Kullanıcı Bazlı Yetki Ezme      |
| - Sohbet Paylaşımı (Shareable Chat Links)                             |
| - Yan Yana Çoklu Model Karşılaştırma Arayüzü                          |
| - Arayüzden Lokal Model İndirme Yöneticisi                            |
| - Yapılandırılabilir Veri Maskeleme Seçenekleri                       |
| - Kullanıcı ve Rol Bazlı Token Kotaları                               |
+-----------------------------------------------------------------------+
                                   │
                                   ▼
+-----------------------------------------------------------------------+
| COULD HAVE (Faz 3 - İlerleyen Aşamada Düşünülebilecekler)             |
| - Otomatik Veri Kaynağı Senkronizasyonları (Klasör izleme vb.)        |
| - Detaylı Maliyet Analitiği ve Kullanım Grafikleri Paneli             |
+-----------------------------------------------------------------------+
```
