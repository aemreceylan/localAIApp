/**
 * @file useModels.ts
 * @description Aktif LLM modellerini sunucudan dinamik yükleyen, seçim durumunu ve
 * yüklenme/hata durumlarını yöneten saf React kancası.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LLMModel } from '#types/chat.types';
import { getActiveModels } from '#services/modelService';

export interface UseModelsReturn {
  models: LLMModel[];
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  isLoading: boolean;
  error: string | null;
  refreshModels: () => Promise<void>;
}

export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [selectedModel, setSelectedModelState] = useState<string>(() => {
    return localStorage.getItem('nexus_selected_model') || '';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setSelectedModel = useCallback((modelId: string) => {
    setSelectedModelState(modelId);
    if (modelId) {
      localStorage.setItem('nexus_selected_model', modelId);
    }
  }, []);

  const refreshModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { models: loadedModels, defaultModel } = await getActiveModels();
      setModels(loadedModels);

      // Kural 5 uyumu: Daha önce bir model seçilmemişse veya seçilen model mevcut listede yoksa,
      // Admin'in dinamik varsayılanını veya listenin ilk modelini ata
      setSelectedModelState((current) => {
        const matched = loadedModels.find(
          (m) => m.id === current || m.name === current || m.id.endsWith(`/${current}`)
        );
        if (matched) {
          localStorage.setItem('nexus_selected_model', matched.id);
          return matched.id;
        }
        const fallback = defaultModel || loadedModels[0]?.id || '';
        if (fallback) {
          localStorage.setItem('nexus_selected_model', fallback);
        }
        return fallback;
      });
    } catch (err) {
      setError((err as Error).message || 'Modeller sunucudan yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  return {
    models,
    selectedModel,
    setSelectedModel,
    isLoading,
    error,
    refreshModels,
  };
}
