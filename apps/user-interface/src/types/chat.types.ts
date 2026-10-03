/**
 * @file chat.types.ts
 * @description Sohbet akışı, oturumlar, mesajlar ve LLM modellerine ilişkin tip tanımları.
 */

import type { RagCitation } from '#types/rag.types';

export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  model?: string;
  metrics?: {
    latencyMs?: number;
    tokens?: number;
    speedTokensPerSec?: number;
    costEstimate?: string;
  };
  citations?: RagCitation[]; // Modelin yararlandığı onaylı RAG referans alıntıları
}

export interface ChatSession {
  _id: string;
  tenant_id?: string;
  title: string;
  model: string;
  prompt_id?: string | null;
  custom_instructions?: string | null;
  created_at: string;
  updated_at: string;
}

export type ModelProvider = 'ollama' | 'openai' | 'anthropic' | 'vllm' | (string & {});

export interface LLMModel {
  id: string;
  name: string;
  provider: ModelProvider;
  isLocal: boolean;
  contextWindow?: number;
  description?: string;
  isDefault?: boolean;
}

export interface PersonaPrompt {
  _id: string;
  tenant_id?: string;
  allowed_roles?: string[];
  title: string;
  slug: string;
  type: 'system_guardrail' | 'persona' | 'custom';
  content: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
}
