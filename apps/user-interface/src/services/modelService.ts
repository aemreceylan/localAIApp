/**
 * @file modelService.ts
 * @description /api/chat/models uç noktası ile sunucudan aktif LLM modellerini çeken servis.
 */

import { apiFetch } from '#services/apiClient';
import type { LLMModel } from '#types/chat.types';

export interface ModelListResponse {
  success: boolean;
  data: LLMModel[];
  defaultModel: string | null;
}

/**
 * Sunucuda kayıtlı ve aktif olan tüm LLM modellerini ve varsa varsayılan model seçimini getirir.
 */
export async function getActiveModels(): Promise<{ models: LLMModel[]; defaultModel: string | null }> {
  const res = await apiFetch<ModelListResponse>('/api/chat/models');
  return {
    models: res.data || [],
    defaultModel: res.defaultModel,
  };
}
