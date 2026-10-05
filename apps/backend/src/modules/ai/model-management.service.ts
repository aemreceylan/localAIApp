/**
 * @file model-management.service.ts
 * @description Kurumsal Model Kataloğu, Yerel Model İndirme (Ollama Pull), Silme ve Varsayılan Model Yönetim Servisi.
 */

import fs from 'node:fs/promises';
import { env } from '#config/env.config.js';
import { aiProviderRegistry } from '#modules/ai/ai.provider.js';
import { ValidationError, BusinessRuleError, NotFoundError } from '#shared/errors/index.js';
import { cacheService } from '#shared/cache/index.js';

export interface ModelPullProgressEvent {
  status: string;
  digest?: string | undefined;
  total?: number | undefined;
  completed?: number | undefined;
  percent?: number | undefined;
}

export class ModelManagementService {
  private readonly defaultModelCacheKey = 'nexus:config:default_model';

  /**
   * Sistemdeki tüm kurulu modelleri ve aktif varsayılan modeli listeler.
   */
  async listModels(): Promise<{ models: any[]; defaultModel: string | null }> {
    const models = await aiProviderRegistry.getAvailableModels();
    const configuredDefault = await cacheService.get<string>(this.defaultModelCacheKey);

    const defaultModel = configuredDefault || models[0]?.id || null;

    const enriched = models.map((m) => ({
      ...m,
      isDefault: m.id === defaultModel,
    }));

    return {
      models: enriched,
      defaultModel,
    };
  }

  /**
   * Varsayılan modeli günceller.
   */
  async setDefaultModel(modelId: string): Promise<{ success: boolean; defaultModel: string }> {
    if (!modelId || !modelId.trim()) {
      throw new ValidationError('Geçerli bir model kimliği belirtilmelidir.');
    }

    const available = await aiProviderRegistry.getAvailableModels();
    const exists = available.some((m) => m.id === modelId || m.name === modelId);
    if (!exists) {
      throw new NotFoundError(`'${modelId}' modeli sistemde kurulu modeller arasında bulunamadı.`);
    }

    await cacheService.set(this.defaultModelCacheKey, modelId);

    // Provider varsayılanını da güncelle
    if (modelId.includes('/')) {
      const provider = modelId.split('/')[0]!;
      aiProviderRegistry.setDefaultProvider(provider);
    }

    return {
      success: true,
      defaultModel: modelId,
    };
  }

  /**
   * Ollama üzerinden model indirme (Pull) işlemini başlatır ve SSE akışıyla ilerlemeyi aktarır.
   * Güvenlik: Sunucu disk doluluk oranı %85 üzerindeyse işlem reddedilir.
   */
  async pullModel(
    modelName: string,
    onProgress: (event: ModelPullProgressEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    if (!modelName || !modelName.trim()) {
      throw new ValidationError('İndirilecek model adı belirtilmelidir.');
    }

    // 1. Disk doluluk denetimi (Specs: %85 eşiği)
    await this.checkDiskSpaceAvailable();

    const cleanModel = modelName.replace(/^ollama[/:]/i, '').trim();
    const ollamaUrl = (env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/api\/?$/, '');

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanModel, stream: true }),
    };
    if (signal) {
      fetchOptions.signal = signal;
    }

    const response = await fetch(`${ollamaUrl}/api/pull`, fetchOptions);

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => 'Bilinmeyen hata');
      throw new BusinessRuleError(`Ollama model indirme başlatılamadı: ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed) as {
              status?: string;
              digest?: string;
              total?: number;
              completed?: number;
            };

            let percent: number | undefined = undefined;
            if (parsed.total && parsed.completed && parsed.total > 0) {
              percent = Number(((parsed.completed / parsed.total) * 100).toFixed(1));
            }

            onProgress({
              status: parsed.status || 'İndiriliyor...',
              digest: parsed.digest,
              total: parsed.total,
              completed: parsed.completed,
              percent,
            });
          } catch {
            // JSON ayrıştırma hatasını atla
          }
        }
      }

      // İndirme tamamlandığında model önbelleğini temizle
      aiProviderRegistry.clearCache();
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Yerel Ollama sunucusundan modeli siler.
   */
  async deleteModel(modelName: string): Promise<{ success: boolean; message: string }> {
    if (!modelName || !modelName.trim()) {
      throw new ValidationError('Silinecek model adı belirtilmelidir.');
    }

    const cleanModel = modelName.replace(/^ollama[/:]/i, '').trim();
    const ollamaUrl = (env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/api\/?$/, '');

    const response = await fetch(`${ollamaUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanModel }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Bilinmeyen hata');
      throw new BusinessRuleError(`Ollama modeli silinemedi: ${errText}`);
    }

    // Önbelleği temizle
    aiProviderRegistry.clearCache();

    // Silinen model varsayılan modelse varsayılanı sıfırla
    const configuredDefault = await cacheService.get<string>(this.defaultModelCacheKey);
    if (configuredDefault === modelName || configuredDefault === `ollama/${cleanModel}`) {
      await cacheService.del(this.defaultModelCacheKey);
    }

    return {
      success: true,
      message: `'${cleanModel}' modeli başarıyla silindi.`,
    };
  }

  /**
   * Sunucu disk doluluk oranını denetler. %85 üzerinde ise hata fırlatır.
   */
  private async checkDiskSpaceAvailable(): Promise<void> {
    try {
      if (typeof fs.statfs === 'function') {
        const stats = await fs.statfs('.');
        if (stats.blocks > 0) {
          const usedPercent = Number((((stats.blocks - stats.bfree) / stats.blocks) * 100).toFixed(1));
          if (usedPercent >= 85) {
            throw new BusinessRuleError(
              `Sunucu disk doluluk oranı (%${usedPercent}) %85 eşiğini aştığı için yeni model indirme işlemi engellendi.`
            );
          }
        }
      }
    } catch (err) {
      if (err instanceof BusinessRuleError) throw err;
      // statfs desteklenmiyorsa veya izin yoksa uyarı geç
    }
  }
}

export const modelManagementService = new ModelManagementService();
