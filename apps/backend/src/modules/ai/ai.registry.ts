import type { LanguageModelV1 } from 'ai';
import type { IAiModelProvider, ModelIdentifier, ModelResolutionOptions } from '#modules/ai/ai.types.js';
import { ValidationError } from '#shared/errors/index.js';

/**
 * ============================================================================
 * TASARIM DESENİ: Registry (Sicil / Katalog) Deseni & Dependency Inversion (SOLID)
 * ============================================================================
 * 
 * [MİMARİ GEREKÇE]:
 * Kurumsal LLM Gateway yapısında sistemin çalışma zamanında hangi sağlayıcıların
 * aktif olduğunu bilmesi, model taleplerini doğru sağlayıcı adaptörüne yönlendirmesi
 * ve Admin tarafından belirlenen dinamik varsayılan sağlayıcıyı işletmesi gerekir.
 * 
 * [KURAL 5 UYUMLULUĞU]:
 * Kod içinde hiçbir model veya sağlayıcı "hardcoded varsayılan" olamaz.
 * Bu sınıf, sağlayıcıları tarafsız olarak kaydeder (`isDefault: false`).
 * Varsayılan sağlayıcı yalnızca Admin veya Tenant yapılandırma servisi tarafından
 * `setDefaultProvider()` metodu çağrılarak dinamik olarak belirlenir.
 * 
 * [ÇÖZÜMLEME ÖNCELİK SIRASI (Resolution Strategy)]:
 * 1. Açıkça belirtilmiş sağlayıcı: 'openai/gpt-4o' veya `{ provider: 'openai', model: 'gpt-4o' }`
 * 2. Modeli doğrudan desteklediğini beyan eden sağlayıcı: `provider.supports(modelName)`
 * 3. Admin tarafından dinamik olarak atanmış varsayılan sağlayıcı: `defaultProviderId`
 * 4. Hiçbiri eşleşmezse: Fail-fast prensibiyle açıklayıcı `422 ValidationError`.
 * 
 * @example
 * const registry = new AiProviderRegistry();
 * registry.registerProvider(ollamaProvider);
 * 
 * // Admin dinamik varsayılan atar:
 * registry.setDefaultProvider('ollama');
 * 
 * // Model çözümlenir:
 * const model = registry.resolveModel('llama3.2:3b');
 */
export class AiProviderRegistry {
  /**
   * Kayıtlı sağlayıcı adaptörlerini tutan dahili harita.
   * Key: Küçük harfe normalize edilmiş sağlayıcı ID'si (örn: 'ollama', 'openai')
   */
  private readonly providers = new Map<string, IAiModelProvider>();

  /**
   * Admin veya Tenant tarafından çalışma zamanında belirlenen dinamik varsayılan sağlayıcı ID'si.
   * Null ise sistemde aktif bir varsayılan sağlayıcı yoktur.
   */
  private defaultProviderId: string | null = null;

  /**
   * Yeni bir AI sağlayıcı adaptörünü merkezi sicile kaydeder.
   * 
   * DİKKAT (Kural 5): Kod seviyesinde örtük (implicit) varsayılan atama yapılmaz.
   * Bir sağlayıcı yalnızca açıkça `isDefault = true` iletilirse varsayılan olarak işaretlenir.
   * 
   * @param {IAiModelProvider} provider - Kaydedilecek sağlayıcı adaptörü nesnesi
   * @param {boolean} [isDefault=false] - Bu sağlayıcı varsayılan olarak işaretlensin mi?
   * @throws {ValidationError} Sağlayıcı nesnesi geçersizse veya `providerId` alanı yoksa
   * 
   * @example
   * aiProviderRegistry.registerProvider(ollamaProvider);
   */
  public registerProvider(provider: IAiModelProvider, isDefault = false): void {
    if (!provider?.providerId) {
      throw new ValidationError('Geçersiz AI sağlayıcı nesnesi.');
    }

    const key = provider.providerId.toLowerCase().trim();
    this.providers.set(key, provider);

    if (isDefault) {
      this.defaultProviderId = key;
    }
  }

  /**
   * Admin veya Sistem Yönetimi tarafından çalışma zamanında varsayılan sağlayıcıyı belirler.
   * 
   * @param {string} providerId - Varsayılan yapılacak kayıtlı sağlayıcının kimliği (örn: 'ollama')
   * @throws {ValidationError} Belirtilen sağlayıcı henüz sisteme kaydedilmemişse fırlatılır
   * 
   * @example
   * aiProviderRegistry.setDefaultProvider('ollama');
   */
  public setDefaultProvider(providerId: string): void {
    const key = (providerId || '').toLowerCase().trim();
    if (!key || !this.providers.has(key)) {
      throw new ValidationError(
        `'${providerId}' kimliğine sahip kayıtlı bir AI sağlayıcısı bulunamadığı için varsayılan olarak atanamaz.`
      );
    }
    this.defaultProviderId = key;
  }

  /**
   * Sistemde anlık olarak aktif olan varsayılan sağlayıcı kimliğini döndürür.
   * 
   * @returns {string | null} Aktif sağlayıcı kimliği veya henüz bir varsayılan belirlenmemişse `null`
   */
  public getDefaultProviderId(): string | null {
    return this.defaultProviderId;
  }

  /**
   * Aktif varsayılan sağlayıcı seçimini sıfırlar (temizler).
   * Test ortamlarında ve tenant oturumu temizliklerinde kullanılır.
   */
  public clearDefaultProvider(): void {
    this.defaultProviderId = null;
  }

  /**
   * Belirtilen ID'ye sahip sağlayıcı adaptörünü döndürür.
   * 
   * @param {string} providerId - Aranacak sağlayıcı kimliği ('ollama', 'openai' vb.)
   * @returns {IAiModelProvider | undefined} Bulunursa sağlayıcı örneği, bulunamazsa undefined
   */
  public getProvider(providerId: string): IAiModelProvider | undefined {
    return this.providers.get(providerId.toLowerCase().trim());
  }

  /**
   * Belirtilen sağlayıcının sistemde kayıtlı olup olmadığını doğrular.
   * 
   * @param {string} providerId - Kontrol edilecek sağlayıcı kimliği
   * @returns {boolean} Kayıtlıysa true, aksi halde false
   */
  public hasProvider(providerId: string): boolean {
    return this.providers.has(providerId.toLowerCase().trim());
  }

  /**
   * Sistemde kayıtlı olan tüm sağlayıcı kimliklerinin listesini döndürür.
   * 
   * @returns {string[]} Kayıtlı sağlayıcı kimlikleri dizisi (örn: ['ollama', 'openai'])
   */
  public listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Model listesi için kısa süreli (60 saniye) bellek içi önbellek.
   * Her sohbet akışında ve arayüz sorgusunda Ollama HTTP sunucusuna mükerrer istek atılmasını önler.
   */
  private cachedModels: Array<{
    id: string;
    name: string;
    provider: string;
    isLocal: boolean;
    description?: string;
    isDefault?: boolean;
  }> | null = null;
  private cachedModelsExpiresAt = 0;

  /**
   * Model önbelleğini temizler (yeni model indirildiğinde veya silindiğinde çağrılır).
   */
  public invalidateModelsCache(): void {
    this.cachedModels = null;
    this.cachedModelsExpiresAt = 0;
  }

  /**
   * Kayıtlı sağlayıcıları tarayarak anlık kullanılabilir model listesini döndürür (Önbellek destekli).
   * 
   * @returns {Promise<Array<{ id: string; name: string; provider: string; isLocal: boolean; description?: string; isDefault?: boolean }>>}
   */
  public async getAvailableModels(): Promise<
    Array<{
      id: string;
      name: string;
      provider: string;
      isLocal: boolean;
      description?: string;
      isDefault?: boolean;
    }>
  > {
    if (this.cachedModels && Date.now() < this.cachedModelsExpiresAt) {
      return this.cachedModels;
    }

    const results: Array<{
      id: string;
      name: string;
      provider: string;
      isLocal: boolean;
      description?: string;
      isDefault?: boolean;
    }> = [];

    for (const [providerId, provider] of this.providers.entries()) {
      if (typeof (provider as any).listInstalledModels === 'function') {
        const models = await (provider as any).listInstalledModels();
        for (const m of models) {
          const modelId = m.id.includes('/') ? m.id : `${providerId}/${m.id}`;
          results.push({
            id: modelId,
            name: m.name,
            provider: providerId,
            isLocal: m.isLocal ?? true,
            description: m.description,
            isDefault: this.defaultProviderId === providerId,
          });
        }
      }
    }

    // Yerel Ollama'da model bulunamazsa veya henüz çekilmemişse katalog modelleri:
    if (results.length === 0) {
      results.push(
        {
          id: 'ollama/llama3.2:3b',
          name: 'Llama 3.2 3B',
          provider: 'ollama',
          isLocal: true,
          description: 'Hafif yerel model (Ollama)',
          isDefault: true,
        },
        {
          id: 'ollama/llama3.3:70b',
          name: 'Llama 3.3 70B',
          provider: 'ollama',
          isLocal: true,
          description: 'Gelişmiş kurumsal açık kaynak model',
        }
      );
    }

    this.cachedModels = results;
    this.cachedModelsExpiresAt = Date.now() + 60000;

    return results;
  }

  /**
   * Model tanımlayıcısını çözümler ve Vercel AI SDK uyumlu `LanguageModelV1` örneğini döner.
   * 
   * [Çözümleme Stratejisi]:
   * 1. Açık Belirteç: options.provider veya 'provider/model'
   * 2. Destek Eşleşmesi: provider.supports(modelName)
   * 3. Admin Varsayılanı: defaultProviderId
   * 
   * @param {ModelIdentifier} modelIdentifier - Model adı ('llama3.2:3b', 'ollama/llama3.2:3b') veya nesne
   * @param {ModelResolutionOptions} [options] - Çözümleme seçenekleri (opsiyonel explicit provider vb.)
   * @returns {LanguageModelV1} İlgili sağlayıcıdan türetilen dil modeli örneği
   * @throws {ValidationError} Model adı boşsa veya uygun bir sağlayıcı bulunamazsa fırlatılır
   * 
   * @example
   * const model = aiProviderRegistry.resolveModel('ollama/llama3.2:3b');
   * const stream = await streamText({ model, messages: [...] });
   */
  public resolveModel(
    modelIdentifier: ModelIdentifier,
    options?: ModelResolutionOptions
  ): LanguageModelV1 {
    const { modelName, explicitProvider } = this.parseIdentifier(modelIdentifier, options);

    // 1. Öncelik: Açıkça belirtilmiş provider (örn: 'openai/gpt-4o' veya { provider: 'openai' })
    if (explicitProvider) {
      const provider = this.getProvider(explicitProvider);
      if (!provider) {
        throw new ValidationError(`'${explicitProvider}' kimliğine sahip bir AI sağlayıcısı bulunamadı.`);
      }
      return provider.getModel(modelName, options);
    }

    // 2. Öncelik: Modeli doğrudan desteklediğini beyan eden sağlayıcı
    for (const provider of this.providers.values()) {
      if (provider.supports(modelName)) {
        return provider.getModel(modelName, options);
      }
    }

    // 3. Öncelik: Admin tarafından dinamik olarak atanmış varsayılan sağlayıcı
    if (this.defaultProviderId) {
      const defaultProvider = this.providers.get(this.defaultProviderId);
      if (defaultProvider) {
        return defaultProvider.getModel(modelName, options);
      }
    }

    throw new ValidationError(
      `'${modelName}' modeli için kayıtlı veya varsayılan bir AI sağlayıcısı bulunamadı. Lütfen modeli 'provider/model' biçiminde belirtin veya Admin panelinden varsayılan sağlayıcı tanımlayın.`
    );
  }

  /**
   * Gelen ham model tanımlayıcısını ve opsiyonları ayrıştırır.
   * Model adını temizler, varsa sağlayıcı ön ekini ('provider/model') ayıklar.
   * 
   * @private
   * @param {ModelIdentifier} modelIdentifier - Ham model tanımlayıcısı (string veya nesne)
   * @param {ModelResolutionOptions} [options] - Ek çözümleme opsiyonları
   * @returns {{ modelName: string; explicitProvider: string | undefined }} Ayrıştırılmış model ve sağlayıcı
   * @throws {ValidationError} Model adı eksik veya geçersizse fırlatılır
   */
  private parseIdentifier(
    modelIdentifier: ModelIdentifier,
    options?: ModelResolutionOptions
  ): { modelName: string; explicitProvider: string | undefined } {
    if (!modelIdentifier) {
      throw new ValidationError('Çalıştırılacak model adı zorunludur.');
    }

    let rawModel = '';
    let explicitProvider = options?.provider;

    if (typeof modelIdentifier === 'string') {
      rawModel = modelIdentifier.trim();
    } else if (typeof modelIdentifier === 'object' && modelIdentifier !== null) {
      rawModel = (modelIdentifier.model || '').trim();
      explicitProvider = explicitProvider || modelIdentifier.provider;
    }

    if (!rawModel) {
      throw new ValidationError('Çalıştırılacak model adı zorunludur.');
    }

    // 'provider/model' formatı kontrolü (örn: 'ollama/llama3.2:3b')
    if (!explicitProvider && rawModel.includes('/')) {
      const parts = rawModel.split('/');
      explicitProvider = parts[0]?.toLowerCase().trim();
      rawModel = parts.slice(1).join('/').trim();
    }

    return { modelName: rawModel, explicitProvider };
  }
}

