import type { LanguageModelV1 } from 'ai';
import type { ModelIdentifier, ModelResolutionOptions } from '@/modules/ai/ai.types.js';
import { AiProviderRegistry } from '@/modules/ai/ai.registry.js';
import { OllamaModelProvider } from '@/modules/ai/providers/ollama.provider.js';

// Varsayılan Ollama Sağlayıcı Adaptörü
export const defaultOllamaProvider = new OllamaModelProvider();

// Ham createOllama instance'ı (Geriye dönük tam uyumluluk için)
export const ollamaProvider = defaultOllamaProvider.rawInstance;

// Merkezi AI Sağlayıcı Sicili (SOLID - Open/Closed Principle)
export const aiProviderRegistry = new AiProviderRegistry();

// Ollama'yı varsayılan yerel sağlayıcı olarak sisteme kaydet
aiProviderRegistry.registerProvider(defaultOllamaProvider, true);

/**
 * İstenen LLM model nesnesini dinamik sağlayıcı sicili üzerinden çözümler ve döndürür.
 * Model adı zorunludur; 'provider/model', düz model adı veya model nesnesi alabilir.
 * 
 * SOLID - Open/Closed Principle:
 * Yeni sağlayıcılar (OpenAI, Anthropic, vLLM vb.) aiProviderRegistry üzerinden
 * sisteme eklenir; bu fonksiyonun veya mevcut sağlayıcıların değiştirilmesine gerek kalmaz.
 */
export function getModel(
  modelIdentifier: ModelIdentifier,
  options?: ModelResolutionOptions
): LanguageModelV1 {
  return aiProviderRegistry.resolveModel(modelIdentifier, options);
}
