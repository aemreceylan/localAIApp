import { describe, it, expect } from 'vitest';
import type { LanguageModelV1 } from 'ai';
import {
  getModel,
  ollamaProvider,
  aiProviderRegistry,
  type IAiModelProvider,
  type ModelResolutionOptions,
} from '@/modules/ai/index.js';
import { ValidationError } from '@/shared/errors/index.js';

describe('AI Provider Katmanı (SOLID Gateway & Registry)', () => {
  it('ollamaProvider tanımlı ve createOllama fonksiyonu olmalıdır (Geriye dönük uyumluluk)', () => {
    expect(ollamaProvider).toBeDefined();
    expect(typeof ollamaProvider).toBe('function');
  });

  it('getModel parametresiz çağrıldığında ValidationError fırlatmalıdır', () => {
    expect(() => getModel('')).toThrowError(ValidationError);
    expect(() => getModel('   ')).toThrowError(ValidationError);
  });

  it('getModel standart model adı verildiğinde varsayılan sağlayıcı (Ollama) ile çözmelidir', () => {
    const model = getModel('llama3.2:3b');
    expect(model).toBeDefined();
    expect(model.modelId).toBe('llama3.2:3b');
    expect(model.provider).toBe('ollama.chat');

    const customModel = getModel('qwen2.5:7b');
    expect(customModel).toBeDefined();
    expect(customModel.modelId).toBe('qwen2.5:7b');
    expect(customModel.provider).toBe('ollama.chat');
  });

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

  it('SOLID OCP: Yeni bir sağlayıcı mevcut kodları değiştirmeden kaydedilebilmelidir', () => {
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

  it('Kayıtlı olmayan sağlayıcı belirtildiğinde açıklayıcı ValidationError fırlatmalıdır', () => {
    expect(() => getModel('nonexistent/test-model')).toThrowError(ValidationError);
  });
});
