# Rich In-Code Documentation & Design Pattern Guidelines

> **KAPSAM:** Tüm AI Kodlama Ajanları & Asistanlar  
> **AMAÇ:** Yazılan kodların yüksek öğreticilikte, net mimari gerekçelere dayalı ve zengin JSDoc / tasarım deseni dokümantasyonuyla donatılmasını garanti altına almak.

---

## 1. Temel Dokümantasyon İlkesi

- Kod sadece **ne yaptığını** değil; **neden o tasarım deseniyle kurgulandığını**, **hangi mimari kurala hizmet ettiğini** ve **ileride nasıl genişletilebileceğini** açıklamalıdır.
- Kuru, aşırı kısa veya fonksiyon adını birebir tekrar eden yorumlar yetersizdir.

---

## 2. Tasarım Desenleri (Design Patterns) İçin Standart JSDoc Şablonu

Factory, Registry, Adapter, Strategy, Facade, Pipeline, Observer gibi tasarım desenlerini barındıran veya soyutlama düzeyi yüksek tüm sınıf ve fonksiyonlarda şu blok zorunludur:

```typescript
/**
 * [Tasarım Deseni & SOLID Rolü]:
 * Örn: SOLID - Factory Method & Open/Closed Principle:
 * AI sağlayıcılarını konfigürasyonlarına göre dinamik olarak üreten fabrika sınıfı.
 *
 * [Mimari Gerekçe & Rol]:
 * Sisteme eklenecek yeni model motorları (OpenAI, Anthropic, vLLM vb.) için
 * kodda değişiklik yapma gereğini ortadan kaldırır.
 *
 * @example
 * // 1. Yerleşik sağlayıcı örneği oluşturma
 * const ollama = aiProviderFactory.createProvider('ollama', { baseURL: 'http://localhost:11434' });
 *
 * // 2. Yeni bir sağlayıcı tipi kaydetme (Genişletilebilirlik)
 * aiProviderFactory.registerCreator('custom', (cfg) => new CustomProvider(cfg));
 *
 * @param {Type} paramName - Parametrenin işlevi ve beklenen veri yapısı.
 * @returns {ReturnType} Döndürülen nesne ve arayüz sözleşmesi.
 * @throws {ValidationError} Geçersiz tip veya parametre durumunda fırlatılan hata.
 */
```

---

## 3. Satır İçi (Inline) Yorumlar

- Multi-tenancy filtreleri, prompt birleştirme öncelikleri, SSE akış yaşam döngüsü gibi kritik iş mantığı adımlarında:
  - Kararın arkasındaki gerekçe (Örn: `// Kural 5 gereği kod seviyesinde default atanamaz; dinamik çözümlenir`).
  - Edge-case durumlarının nasıl ele alındığı.
