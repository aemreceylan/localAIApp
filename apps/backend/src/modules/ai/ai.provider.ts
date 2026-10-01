import type { LanguageModelV1 } from 'ai';
import type { ModelIdentifier, ModelResolutionOptions } from '#modules/ai/ai.types.js';
import { AiProviderRegistry } from '#modules/ai/ai.registry.js';
import { aiProviderFactory } from '#modules/ai/ai.factory.js';
import type { OllamaModelProvider } from '#modules/ai/providers/ollama.provider.js';

/**
 * ============================================================================
 * TASARIM DESENİ: Facade & Singleton Gateway
 * ============================================================================
 * 
 * [MİMARİ GEREKÇE]:
 * Bu dosya, `ai` modülünün dışarıya açılan operasyonel giriş noktasıdır.
 * Uygulamanın diğer katmanları (örneğin `chat.service.ts` veya `rag.worker.ts`),
 * iç sağlayıcı yapılandırmalarının detayını bilmek zorunda kalmadan tek bir
 * standart fonksiyon (`getModel`) üzerinden istenen LLM nesnesine erişir.
 * 
 * [KURAL 5 UYUMLULUĞU]:
 * - Burada başlatılan yerel Ollama motoru `isDefault: false` ile kaydedilmiştir.
 * - Sistemde hardcoded hiçbir model adı veya varsayılan motor referansı bulunmaz.
 * - Varsayılan sağlayıcıyı yalnızca Admin paneli dinamik olarak set eder.
 */

// Merkezi AI Sağlayıcı Sicili (SOLID - Open/Closed Principle)
export const aiProviderRegistry = new AiProviderRegistry();

// Yerel Ollama sağlayıcısını Factory üzerinden üret ve kaydet
// DİKKAT (Kural 5): Hiçbir sağlayıcı kodda hardcoded olarak varsayılan (default) yapılamaz!
// Varsayılan sağlayıcıyı yalnızca Admin dinamik olarak belirler (aiProviderRegistry.setDefaultProvider).
const initialOllamaProvider = aiProviderFactory.createProvider('ollama');
aiProviderRegistry.registerProvider(initialOllamaProvider, false);

/**
 * Ham createOllama instance'ına kontrollü erişim.
 * Vercel AI SDK doğrudan sağlayıcı örneği gerektiren eski entegrasyonlar için geriye dönük uyumluluk sağlar.
 */
export const ollamaProvider = (initialOllamaProvider as OllamaModelProvider).rawInstance;

/**
 * İstenen LLM model nesnesini dinamik sağlayıcı sicili (aiProviderRegistry) üzerinden çözer ve döndürür.
 * 
 * SOLID - Open/Closed Principle:
 * Yeni sağlayıcılar (OpenAI, Anthropic, vLLM vb.) eklendiğinde bu fonksiyonun
 * veya çağıran servislerin değiştirilmesine gerek kalmaz.
 * 
 * @param {ModelIdentifier} modelIdentifier - İstenen model tanımlayıcısı.
 *        - Açık Sağlayıcı Formatı: 'ollama/llama3.2:3b', 'openai/gpt-4o'
 *        - Standart Model Adı: 'llama3.2:3b' (Yalnızca Admin bir varsayılan sağlayıcı atadıysa çözümlenir)
 *        - Nesne Formatı: `{ model: 'llama3.2:3b', provider: 'ollama' }`
 * @param {ModelResolutionOptions} [options] - Çözümleme seçenekleri (opsiyonel provider override vb.)
 * @returns {LanguageModelV1} Vercel AI SDK streamText veya generateText ile doğrudan kullanılabilecek model örneği
 * @throws {ValidationError} Model adı boşsa veya uygun bir sağlayıcı bulunamazsa (HTTP 422)
 * 
 * @example
 * // 1. Açık sağlayıcı belirterek model çağırma:
 * const model = getModel('ollama/llama3.2:3b');
 * const { textStream } = await streamText({ model, messages });
 * 
 * // 2. Parametrik nesne ile çağırma:
 * const model = getModel({ model: 'gpt-4o', provider: 'openai' });
 */
export function getModel(
  modelIdentifier: ModelIdentifier,
  options?: ModelResolutionOptions
): LanguageModelV1 {
  return aiProviderRegistry.resolveModel(modelIdentifier, options);
}


