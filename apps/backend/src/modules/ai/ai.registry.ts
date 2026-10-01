import type { LanguageModelV1 } from 'ai';
import type { IAiModelProvider, ModelIdentifier, ModelResolutionOptions } from '#modules/ai/ai.types.js';
import { ValidationError } from '#shared/errors/index.js';

/**
 * SOLID - Open/Closed & Single Responsibility:
 * AI sağlayıcılarını dinamik olarak kaydeden ve model taleplerini uygun
 * sağlayıcıya yönlendiren merkezi sağlayıcı sicili (Provider Registry).
 *
 * Yeni bir AI motoru eklemek için bu sınıfı değiştirmeye gerek yoktur;
 * registerProvider() metodu ile yeni sağlayıcılar runtime veya bootstrap
 * aşamasında sisteme dahil edilebilir.
 */
export class AiProviderRegistry {
  private readonly providers = new Map<string, IAiModelProvider>();
  private defaultProviderId: string | null = null;

  /**
   * Yeni bir AI sağlayıcı adaptörünü kaydeder.
   */
  public registerProvider(provider: IAiModelProvider, isDefault = false): void {
    if (!provider?.providerId) {
      throw new ValidationError('Geçersiz AI sağlayıcı nesnesi.');
    }

    const key = provider.providerId.toLowerCase();
    this.providers.set(key, provider);

    if (isDefault || !this.defaultProviderId) {
      this.defaultProviderId = key;
    }
  }

  /**
   * Belirtilen ID'ye sahip sağlayıcıyı döndürür.
   */
  public getProvider(providerId: string): IAiModelProvider | undefined {
    return this.providers.get(providerId.toLowerCase());
  }

  /**
   * Sağlayıcının kayıtlı olup olmadığını döndürür.
   */
  public hasProvider(providerId: string): boolean {
    return this.providers.has(providerId.toLowerCase());
  }

  /**
   * Kayıtlı tüm sağlayıcı kimliklerini listeler.
   */
  public listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Model tanımlayıcısını çözümler ve ilgili sağlayıcıdan LanguageModelV1 örneğini döner.
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

    // 3. Öncelik: Varsayılan sağlayıcı (Örn: Self-hosted yerel Ollama)
    if (this.defaultProviderId) {
      const defaultProvider = this.providers.get(this.defaultProviderId);
      if (defaultProvider) {
        return defaultProvider.getModel(modelName, options);
      }
    }

    throw new ValidationError(`'${modelName}' modeli için kayıtlı bir AI sağlayıcısı bulunamadı.`);
  }

  /**
   * Gelen model tanımlayıcısını ayrıştırır ve doğrular.
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

    // 'provider/model' formatı kontrolü
    if (!explicitProvider && rawModel.includes('/')) {
      const parts = rawModel.split('/');
      explicitProvider = parts[0]?.toLowerCase().trim();
      rawModel = parts.slice(1).join('/').trim();
    }

    return { modelName: rawModel, explicitProvider };
  }
}
