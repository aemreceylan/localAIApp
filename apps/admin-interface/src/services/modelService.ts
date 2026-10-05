/**
 * @file modelService.ts
 * @description Admin Paneli Model Yönetimi, SSE İndirme ve Silme API Servisi.
 */

import { apiClient } from '#services/apiClient.js';
import type { AiModel, ModelPullProgress } from '#types/model.js';

export const modelService = {
  /**
   * Tüm kurulu modelleri ve varsayılan modeli listeler.
   */
  async listModels(): Promise<{ models: AiModel[]; defaultModel: string | null }> {
    return await apiClient<{ models: AiModel[]; defaultModel: string | null }>('/api/admin/models');
  },

  /**
   * Varsayılan modeli belirler.
   */
  async setDefaultModel(modelId: string): Promise<void> {
    await apiClient('/api/admin/models/default', {
      method: 'POST',
      body: JSON.stringify({ modelId }),
    });
  },

  /**
   * Modeli yerel sunucudan kaldırır.
   */
  async deleteModel(modelName: string): Promise<void> {
    await apiClient(`/api/admin/models/${encodeURIComponent(modelName)}`, {
      method: 'DELETE',
    });
  },

  /**
   * Yerel Ollama modelini SSE akışıyla indirir.
   */
  async pullModel(
    modelName: string,
    onProgress: (progress: ModelPullProgress) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const response = await fetch('/api/admin/models/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ modelName }),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Model indirme isteği başarısız oldu (HTTP ${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const trimmed = block.trim();
          if (!trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
          try {
            const data = JSON.parse(jsonStr) as ModelPullProgress;
            onProgress(data);
          } catch {
            // Hatalı JSON bloğunu yoksay
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
