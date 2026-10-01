import { createOllama } from 'ollama-ai-provider';
import type { LanguageModelV1 } from 'ai';
import type { IAiModelProvider, ModelResolutionOptions } from '@/modules/ai/ai.types.js';
import { env } from '@/config/env.config.js';
import { ValidationError } from '@/shared/errors/index.js';

/**
 * SOLID - Single Responsibility & Liskov Substitution:
 * Ollama yerel model motoruna özel adaptör implementasyonu.
 */
export class OllamaModelProvider implements IAiModelProvider {
  public readonly providerId = 'ollama';
  private readonly providerInstance: ReturnType<typeof createOllama>;

  constructor(baseURL: string = env.OLLAMA_BASE_URL) {
    this.providerInstance = createOllama({ baseURL });
  }

  /**
   * Doğrudan erişim gereken senaryolar için ham provider instance'ı.
   */
  public get rawInstance(): ReturnType<typeof createOllama> {
    return this.providerInstance;
  }

  /**
   * Model adının Ollama tarafından desteklenip desteklenmediğini kontrol eder.
   * "ollama/llama3.2", "ollama:llama3.2" veya sağlayıcı ön eki bulunmayan modelleri kabul eder.
   */
  public supports(modelIdentifier: string): boolean {
    if (!modelIdentifier) {
      return false;
    }
    const lower = modelIdentifier.toLowerCase().trim();
    return lower.startsWith('ollama/') || lower.startsWith('ollama:') || !lower.includes('/');
  }

  /**
   * Ollama model nesnesini üretir.
   */
  public getModel(modelName: string, _options?: ModelResolutionOptions): LanguageModelV1 {
    if (!modelName || modelName.trim() === '') {
      throw new ValidationError('Ollama modeli için geçerli bir model adı belirtilmelidir.');
    }

    const cleanModelName = modelName.replace(/^ollama[/:]/i, '').trim();
    if (cleanModelName === '') {
      throw new ValidationError('Ollama model adı boş olamaz.');
    }

    return this.providerInstance(cleanModelName);
  }
}
