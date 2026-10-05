/**
 * @file model.ts
 * @description Kurumsal LLM ve yerel modeller tip tanımları.
 */

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  isLocal: boolean;
  description?: string;
  isDefault: boolean;
  sizeGb?: string;
  parameterSize?: string;
}

export interface ModelPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
  error?: string;
}
