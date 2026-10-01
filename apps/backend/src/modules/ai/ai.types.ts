import type { LanguageModelV1 } from 'ai';

/**
 * Model çözümleme ve çalıştırma parametreleri
 */
export interface ModelResolutionOptions {
  provider?: string;
  [key: string]: unknown;
}

/**
 * Model tanımlayıcı türü: Model adı (düz string) veya provider parametresi içeren nesne
 */
export type ModelIdentifier =
  | string
  | {
      model: string;
      provider?: string;
      [key: string]: unknown;
    };

/**
 * SOLID - Open/Closed & Dependency Inversion Prensibi:
 * Tüm AI model sağlayıcı adaptörlerinin uygulaması gereken standart sözleşme.
 * Yeni bir model sağlayıcısı (OpenAI, Anthropic, vLLM vb.) sisteme eklenirken
 * mevcut kodları değiştirmeden yalnızca bu arayüzü uygulayan yeni bir sınıf eklenir.
 */
export interface IAiModelProvider {
  /**
   * Sağlayıcının benzersiz kimliği (örn: 'ollama', 'openai', 'anthropic', 'vllm')
   */
  readonly providerId: string;

  /**
   * Verilen model tanımlayıcısının bu sağlayıcı tarafından desteklenip desteklenmediğini doğrular.
   */
  supports(modelIdentifier: string): boolean;

  /**
   * Sağlayıcıya ait LanguageModelV1 nesnesini döndürür.
   */
  getModel(modelName: string, options?: ModelResolutionOptions): LanguageModelV1;
}

/**
 * Desteklenen temel AI sağlayıcı türleri
 */
export type SupportedAiProviderType =
  | 'ollama'
  | 'openai'
  | 'anthropic'
  | 'vllm'
  | (string & {});

/**
 * Ollama sağlayıcı yapılandırması
 */
export interface OllamaProviderConfig {
  baseURL?: string;
}

/**
 * OpenAI sağlayıcı yapılandırması
 */
export interface OpenAiProviderConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
}

/**
 * Anthropic sağlayıcı yapılandırması
 */
export interface AnthropicProviderConfig {
  apiKey: string;
  baseURL?: string;
}

/**
 * vLLM sağlayıcı yapılandırması (OpenAI uyumlu endpoint)
 */
export interface VllmProviderConfig {
  baseURL: string;
  apiKey?: string;
}

/**
 * Ortak sağlayıcı yapılandırma tipi
 */
export type AiProviderConfig =
  | OllamaProviderConfig
  | OpenAiProviderConfig
  | AnthropicProviderConfig
  | VllmProviderConfig
  | Record<string, unknown>;

/**
 * Factory sağlayıcı oluşturucu fonksiyon sözleşmesi
 */
export type ProviderCreatorFn<TConfig = unknown> = (config?: TConfig) => IAiModelProvider;

