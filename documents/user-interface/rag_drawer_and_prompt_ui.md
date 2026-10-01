# USER INTERFACE RAG ÇEKMECESİ VE PROMPT YÖNETİMİ SPESİFİKASYONU

> **DOKÜMAN TİPİ:** Alt Proje RAG & Prompt Arayüz Şartnamesi (`apps/user-interface`)  
> **Proje:** Kurumsal LLM & Veri Yönetim Platformu (_NexusAI Gateway & Knowledge Base_)  
> **İlişkili Dokümanlar:** [Ortak PRD v2.1.0](../common/prd.md), [İş Akışları](../common/data_and_business_workflows.md), [Canlı Prototip](../stitch_design_preview.html)  

---

## 1. Sağ RAG Doküman Önizleme Çekmecesi (Inspector Drawer)

RAG destekli yanıtlarda kurumsal verilerin doğrulanabilirliği için sağ çekmece ekranın ayrılmaz bir parçasıdır.

### 1.1. Boyut ve Yerleşim

- Genişlik: `350px` - `420px` (ekran genişliğine göre esnek).
- Merkez sohbet alanını sıkıştırarak sağdan açılır; içerik overlay ile örtülmez, kullanıcı hem sohbeti hem çekmeceyi aynı anda okuyabilir.
- Üst sağdaki kapatma butonu veya `Escape` tuşu ile kapanır.

### 1.2. İçerik ve Göstergeler

1. **Benzerlik Skoru Kartı:** Qdrant vektör kosinüs yakınlık skoru (Örn: `%94 Eşleşme` rozeti).
2. **Chunk Üst Verisi:** Kaynak doküman adı, sayfa numarası, bölüm başlığı ve parça indeksi.
3. **Metin Önizleme Alanı:** Dokümandan çıkarılan orijinal metin parçası (LLM'e bağlam olarak verilen kesit). Kullanıcının aradığı anahtar kelimeler sarı zeminle vurgulanır.
4. **Doküman Aksiyonları:** Orijinal dokümanı tam ekran açma veya yerel cihaza indirme butonları.

---

## 2. Metin İçi Kaynak Gösterimi (In-text Citations)

- LLM bir yanıt üretirken RAG kaynaklarına atıfta bulunduğunda, metin içinde küçük tıklanabilir rozetler yer alır:
  - Örnek: `[1] sozlesme_2026.pdf (s. 14)`
- Kullanıcı rozete tıkladığında:
  1. Sağ RAG çekmecesi henüz açık değilse otomatik açılır.
  2. İlgili kaynak parçasının kartına yumuşak kaydırma (smooth scroll) yapılır.
  3. İlgili kart kısa süreli mavi vurgu ile parlar.

---

## 3. Anlık Doküman Yükleme ve Sohbet İçi Analiz

Kullanıcı, kurumsal bilgi bankasında bulunmayan yerel bir belge üzerinde anlık soru sormak istediğinde:

1. Yüzen prompt dock'undaki `+` butonuna basar veya dosyayı sürükleyip sohbet alanına bırakır (Drag & Drop).
2. Desteklenen formatlar: PDF, TXT, DOCX, CSV, MD.
3. Dosya yüklenirken küçük bir ilerleme halkası gösterilir; yükleme tamamlandığında dosya adı bir çip (chip) olarak girdi kutusunun üzerinde belirir.
4. Kullanıcı sorusunu sorduğunda, arka planda dosya hızlıca parçalanır ve yalnızca o oturuma özel bağlam oluşturulur.

---

## 4. Dinamik Persona Seçimi ve Ek Talimat (Prompt Stacking UI)

- **Persona / Şablon Seçici:**
  - Yüzen dock üzerindeki şablon simgesine tıklandığında açılan popover menüde kurum admini tarafından tanımlanmış aktif personolar listelenir (_Örn: "Genel Asistan", "Kıdemli Avukat", "Kod İnceleyici"_).
  - Kullanıcı istediği personayı seçtiğinde sohbet oturumunun `prompt_id` parametresi güncellenir.
- **Özel Yönerge Ekleme (Custom Instructions):**
  - Kullanıcı dilerse "Oturum Ayarları" sekmesinden bu sohbete özel ek yönerge (`custom_instructions`) tanımlayabilir (_Örn: "Cevapları Türkçe ve en fazla 3 maddede ver"_).
  - Bu yönerge backend'deki Prompt Stacking motorunda kurumsal guardrail ve personanın ardından 3. katman olarak derlenir.
