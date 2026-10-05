import { createOllama } from 'ollama-ai-provider';
import type { LanguageModelV1 } from 'ai';
import type { IAiModelProvider, ModelResolutionOptions, OllamaProviderConfig } from '#modules/ai/ai.types.js';
import { env } from '#config/env.config.js';
import { ValidationError } from '#shared/errors/index.js';

/**
 * SOLID - Single Responsibility & Liskov Substitution:
 * Ollama yerel model motoruna özel adaptör implementasyonu.
 */
export class OllamaModelProvider implements IAiModelProvider {
  public readonly providerId = 'ollama';
  private readonly providerInstance: ReturnType<typeof createOllama>;
  private readonly baseURL: string;

  constructor(config?: OllamaProviderConfig) {
    this.baseURL = config?.baseURL || env.OLLAMA_BASE_URL;
    this.providerInstance = createOllama({ baseURL: this.baseURL });
  }

  /**
   * Doğrudan erişim gereken senaryolar için ham provider instance'ı.
   */
  public get rawInstance(): ReturnType<typeof createOllama> {
    return this.providerInstance;
  }

  /**
   * Ollama yerel sunucusundaki indirilmiş / kullanılabilir modelleri sorgular.
   * Sunucu kapalı veya erişilemez olduğunda sistemin çökmemesi için sessizce boş dizi döner.
   */
  public async listInstalledModels(): Promise<
    Array<{ id: string; name: string; isLocal: boolean; description?: string }>
  > {
    try {
      const cleanUrl = this.baseURL.replace(/\/api\/?$/, '');
      let response: Response | null = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        response = await fetch(`${cleanUrl}/api/tags`, { signal: controller.signal });
        clearTimeout(timeoutId);
      } catch (networkErr) {
        if (cleanUrl.includes('localhost')) {
          const fallbackUrl = cleanUrl.replace('localhost', '127.0.0.1');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          response = await fetch(`${fallbackUrl}/api/tags`, { signal: controller.signal });
          clearTimeout(timeoutId);
        } else {
          throw networkErr;
        }
      }

      if (!response || !response.ok) {
        return [];
      }

      const data = (await response.json()) as {
        models?: Array<{
          name: string;
          size?: number;
          details?: { parameter_size?: string; family?: string };
        }>;
      };

      if (!Array.isArray(data?.models)) {
        return [];
      }

      return data.models.map((m) => {
        const sizeGb = m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : '';
        const paramSize = m.details?.parameter_size ? ` (${m.details.parameter_size})` : '';
        return {
          id: m.name,
          name: m.name,
          isLocal: true,
          description: `Yerel Ollama Modeli${paramSize} ${sizeGb}`.trim(),
        };
      });
    } catch {
      // Ollama servisi çalışmıyorsa hata fırlatılmaz, boş döner
      return [];
    }
  }

  /**
   * Model adının Ollama tarafından desteklenip desteklenmediğini kontrol eder.
   * "ollama/llama3.2" veya "ollama:llama3.2" gibi açık ollama etiketli modelleri kabul eder.
   */
  public supports(modelIdentifier: string): boolean {
    if (!modelIdentifier) {
      return false;
    }
    const lower = modelIdentifier.toLowerCase().trim();
    return lower.startsWith('ollama/') || lower.startsWith('ollama:');
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
