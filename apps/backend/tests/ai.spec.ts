import { describe, it, expect, beforeEach } from 'vitest';
import type { LanguageModelV1 } from 'ai';
import {
  getModel,
  ollamaProvider,
  aiProviderRegistry,
  aiProviderFactory,
  AiProviderFactory,
  type IAiModelProvider,
  type ModelResolutionOptions,
} from '#modules/ai/index.js';
import { ValidationError } from '#shared/errors/index.js';

describe('AI Provider Katmanı (SOLID Gateway, Factory & Registry)', () => {
  beforeEach(() => {
    // Her test öncesi registry varsayılanını temizle
    aiProviderRegistry.clearDefaultProvider();
  });

  describe('Geriye Dönük Uyumluluk ve Temel Doğrulamalar', () => {
    it('ollamaProvider tanımlı ve createOllama fonksiyonu olmalıdır', () => {
      expect(ollamaProvider).toBeDefined();
      expect(typeof ollamaProvider).toBe('function');
    });

    it('getModel parametresiz çağrıldığında ValidationError fırlatmalıdır', () => {
      expect(() => getModel('')).toThrowError(ValidationError);
      expect(() => getModel('   ')).toThrowError(ValidationError);
    });
  });

  describe('AiProviderFactory (Factory Deseni & OCP)', () => {
    it('factory yerleşik ollama sağlayıcısını başarıyla üretebilmelidir', () => {
      const provider = aiProviderFactory.createProvider('ollama');
      expect(provider).toBeDefined();
      expect(provider.providerId).toBe('ollama');
      expect(provider.supports('ollama/llama3.2:3b')).toBe(true);
    });

    it('factory desteklenmeyen bir sağlayıcı türünde ValidationError fırlatmalıdır', () => {
      expect(() => aiProviderFactory.createProvider('unsupported-engine' as any)).toThrowError(
        ValidationError
      );
    });

    it('registerCreator ile runtime/bootstrap sırasında yeni sağlayıcı tipi eklenebilmelidir (OCP)', () => {
      const customFactory = new AiProviderFactory();
      customFactory.registerCreator('vllm', () => ({
        providerId: 'vllm',
        supports: (id: string) => id.startsWith('vllm/'),
        getModel: (name: string) =>
          ({
            modelId: name,
            provider: 'vllm.chat',
            specificationVersion: 'v1',
          } as unknown as LanguageModelV1),
      }));

      expect(customFactory.supportsType('vllm')).toBe(true);
      const vllmProvider = customFactory.createProvider('vllm');
      expect(vllmProvider.providerId).toBe('vllm');
    });
  });

  describe('Dinamik Çözümleme ve Admin Varsayılan Sağlayıcı Yönetimi', () => {
    it('getModel "provider/model" formatı verildiğinde ilgili sağlayıcıyı hedeflemelidir', () => {
      const model = getModel('ollama/llama3.2:3b');
      expect(model).toBeDefined();
      expect(model.modelId).toBe('llama3.2:3b');
      expect(model.provider).toBe('ollama.chat');
    });

    it('getModel nesne formatında ({ model, provider }) çağrılabilmelidir', () => {
      const model = getModel({ model: 'llama3.2:3b', provider: 'ollama' });
      expect(model).toBeDefined();
      expect(model.modelId).toBe('llama3.2:3b');
      expect(model.provider).toBe('ollama.chat');
    });

    it('Admin varsayılan sağlayıcı belirlemediğinde (hardcoded default yok), ön eksiz modellerde ValidationError fırlatmalıdır', () => {
      // Varsayılan atanmamış durumda iken ön eksiz çağrı hata vermelidir (Kural 5)
      expect(() => getModel('llama3.2:3b')).toThrowError(ValidationError);
    });

    it('Admin setDefaultProvider ile dinamik varsayılan atadığında standart modeller çözümlenebilmelidir', () => {
      aiProviderRegistry.setDefaultProvider('ollama');
      expect(aiProviderRegistry.getDefaultProviderId()).toBe('ollama');

      const model = getModel('llama3.2:3b');
      expect(model).toBeDefined();
      expect(model.modelId).toBe('llama3.2:3b');
      expect(model.provider).toBe('ollama.chat');
    });

    it('Kayıtlı olmayan bir sağlayıcı setDefaultProvider yapılmaya çalışıldığında ValidationError fırlatmalıdır', () => {
      expect(() => aiProviderRegistry.setDefaultProvider('non-existent')).toThrowError(
        ValidationError
      );
    });

    it('Kayıtlı olmayan sağlayıcı belirtildiğinde açıklayıcı ValidationError fırlatmalıdır', () => {
      expect(() => getModel('nonexistent/test-model')).toThrowError(ValidationError);
    });
  });

  describe('SOLID OCP: Harici Sağlayıcı Entegrasyonu', () => {
    it('Yeni bir sağlayıcı mevcut kodları değiştirmeden kaydedilebilmelidir', () => {
      const mockModelInstance = {
        modelId: 'mock-model-v1',
        provider: 'mock.chat',
        specificationVersion: 'v1',
        doGenerate: async () => ({
          text: 'mock response',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1 },
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
        doStream: async () => ({
          stream: new ReadableStream(),
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
      } as unknown as LanguageModelV1;

      class MockCustomProvider implements IAiModelProvider {
        public readonly providerId = 'mock';
        public supports(modelIdentifier: string): boolean {
          return modelIdentifier.toLowerCase().startsWith('mock/');
        }
        public getModel(modelName: string, _options?: ModelResolutionOptions): LanguageModelV1 {
          return {
            ...mockModelInstance,
            modelId: modelName.replace(/^mock[/:]/i, ''),
          } as LanguageModelV1;
        }
      }

      aiProviderRegistry.registerProvider(new MockCustomProvider());
      expect(aiProviderRegistry.hasProvider('mock')).toBe(true);

      const resolved = getModel('mock/custom-llama');
      expect(resolved).toBeDefined();
      expect(resolved.modelId).toBe('custom-llama');
      expect(resolved.provider).toBe('mock.chat');
    });
  });
});

