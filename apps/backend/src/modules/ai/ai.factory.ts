import type {
  IAiModelProvider,
  SupportedAiProviderType,
  AiProviderConfig,
  ProviderCreatorFn,
  OllamaProviderConfig,
} from '#modules/ai/ai.types.js';
import { OllamaModelProvider } from '#modules/ai/providers/ollama.provider.js';
import { ValidationError } from '#shared/errors/index.js';

/**
 * ============================================================================
 * TASARIM DESENİ: Factory Method (Fabrika Metodu) & Open/Closed Prensibi (SOLID)
 * ============================================================================
 * 
 * [MİMARİ GEREKÇE]:
 * Kurumsal LLM Gateway yapısında farklı sağlayıcılar (Self-hosted Ollama, vLLM,
 * bulut tabanlı OpenAI, Anthropic vb.) farklı bağlantı parametrelerine (Base URL,
 * API Anahtarı, Organizasyon ID vb.) ihtiyaç duyar.
 * 
 * Doğrudan `new OllamaModelProvider()` veya `new OpenAIProvider()` gibi somut
 * sınıflara bağımlı olmak (tight coupling), kodda hardcoded referanslara yol açar
 * ve Admin panelinden dinamik sağlayıcı tanımlanmasını imkansız kılar.
 * 
 * [BU FABRİKANIN GÖREVİ]:
 * 1. Sağlayıcı nesnelerinin üretim sürecini soyutlar ve tek bir merkezden yönetir.
 * 2. Sisteme yeni bir LLM motoru eklendiğinde (OCP), mevcut fabrika kodunu
 *    değiştirmeden `registerCreator` metoduyla yeni motor tipleri kaydedilebilir.
 * 3. Hatalı veya desteklenmeyen sağlayıcı türlerinde erken hata (fail-fast) üretir.
 * 
 * @example
 * // 1. Yerleşik Ollama sağlayıcısı üretimi
 * const ollama = aiProviderFactory.createProvider('ollama', {
 *   baseURL: 'http://localhost:11434'
 * });
 * 
 * // 2. Gelecekte yeni bir motorun (örn. vLLM) sisteme tanıtılması:
 * aiProviderFactory.registerCreator('vllm', (config) => {
 *   return new VllmModelProvider(config);
 * });
 * const vllm = aiProviderFactory.createProvider('vllm', { baseURL: 'http://vllm-host:8000' });
 */
export class AiProviderFactory {
  /**
   * Sağlayıcı türlerine göre kayıtlı üretici fonksiyonları saklayan sicil haritası.
   * Anahtar: Sağlayıcı tür kimliği (küçük harfe normalize edilmiş string, örn: 'ollama')
   * Değer: İlgili konfigürasyonu alıp `IAiModelProvider` örneği dönen üretici fonksiyon
   */
  private readonly creators = new Map<string, ProviderCreatorFn<any>>();

  /**
   * Fabrikayı başlatır ve temel yerleşik üreticileri kaydeder.
   */
  constructor() {
    this.registerBuiltInCreators();
  }

  /**
   * Sistem açılışında çekirdeğe dahil olan yerleşik sağlayıcıları kaydeder.
   * Şimdilik yerel öncelikli self-hosted mimarimiz için 'ollama' motorunu içerir.
   */
  private registerBuiltInCreators(): void {
    this.registerCreator('ollama', (config?: OllamaProviderConfig) => {
      return new OllamaModelProvider(config);
    });
  }

  /**
   * Sisteme yeni bir AI motoru tipi (örn. 'openai', 'anthropic', 'vllm') için üretici fonksiyon kaydeder.
   * 
   * SOLID - Open/Closed Principle:
   * Bu metot sayesinde yeni model motorları sisteme dahil edilirken bu sınıfın kaynak kodu
   * değiştirilmez; bootstrap veya eklenti (plugin) seviyesinde dinamik kayıt yapılır.
   * 
   * @template TConfig - Sağlayıcının kabul ettiği konfigürasyon tipi
   * @param {string} type - Sağlayıcı tür adı (örn: 'openai', 'anthropic', 'vllm')
   * @param {ProviderCreatorFn<TConfig>} creatorFn - İlgili sağlayıcı nesnesini oluşturan fabrika fonksiyonu
   * @throws {ValidationError} Geçersiz veya boş tür adı / fonksiyon verildiğinde fırlatılır
   * 
   * @example
   * aiProviderFactory.registerCreator<OpenAiConfig>('openai', (cfg) => {
   *   return new OpenAiModelProvider(cfg);
   * });
   */
  public registerCreator<TConfig = unknown>(
    type: string,
    creatorFn: ProviderCreatorFn<TConfig>
  ): void {
    if (!type || typeof type !== 'string') {
      throw new ValidationError('Geçerli bir sağlayıcı türü belirtilmelidir.');
    }
    if (typeof creatorFn !== 'function') {
      throw new ValidationError('Sağlayıcı üretici fonksiyonu zorunludur.');
    }

    this.creators.set(type.toLowerCase().trim(), creatorFn);
  }

  /**
   * İstenen türde ve verilen konfigürasyona sahip bir AI sağlayıcı örneği üretir.
   * 
   * @template TConfig - Yapılandırma nesnesinin tipi
   * @param {SupportedAiProviderType} type - Üretilecek sağlayıcı motorunun adı ('ollama', 'openai', vb.)
   * @param {TConfig} [config] - Sağlayıcıya özel opsiyonel yapılandırma (Base URL, API anahtarı, vb.)
   * @returns {IAiModelProvider} Vercel AI SDK uyumlu ve `IAiModelProvider` sözleşmesine uyan adaptör örneği
   * @throws {ValidationError} Tür adı boşsa veya sistemde kayıtlı olmayan bir sağlayıcı istenmişse
   * 
   * @example
   * const provider = aiProviderFactory.createProvider('ollama', {
   *   baseURL: 'http://127.0.0.1:11434'
   * });
   * const model = provider.getModel('llama3.2:3b');
   */
  public createProvider<TConfig extends AiProviderConfig = AiProviderConfig>(
    type: SupportedAiProviderType,
    config?: TConfig
  ): IAiModelProvider {
    if (!type || typeof type !== 'string') {
      throw new ValidationError('Sağlayıcı türü belirtilmelidir.');
    }

    const normalizedType = type.toLowerCase().trim();
    const creator = this.creators.get(normalizedType);

    if (!creator) {
      throw new ValidationError(
        `'${type}' türünde bir AI sağlayıcı fabrikası bulunamadı. Desteklenen türler: ${this.getSupportedTypes().join(', ')}`
      );
    }

    return creator(config);
  }

  /**
   * Fabrikaya kayıtlı olan ve anlık olarak üretilebilen tüm sağlayıcı türlerini döndürür.
   * Admin paneli sağlayıcı ekleme ekranlarında seçenekleri listelemek için kullanılır.
   * 
   * @returns {string[]} Desteklenen motor türlerinin listesi (örn: ['ollama', 'openai'])
   */
  public getSupportedTypes(): string[] {
    return Array.from(this.creators.keys());
  }

  /**
   * Belirtilen motor türünün fabrikada kayıtlı olup olmadığını doğrular.
   * 
   * @param {string} type - Kontrol edilecek sağlayıcı türü
   * @returns {boolean} Destekleniyorsa true, aksi halde false
   */
  public supportsType(type: string): boolean {
    return this.creators.has((type || '').toLowerCase().trim());
  }
}

/**
 * Uygulama genelinde kullanılacak Singleton fabrika örneği.
 * Sağlayıcı üretimi ve dinamik motor kayıtları bu nesne üzerinden yürütülür.
 */
export const aiProviderFactory = new AiProviderFactory();

