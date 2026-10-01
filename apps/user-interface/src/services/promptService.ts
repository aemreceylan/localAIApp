/**
 * @file promptService.ts
 * @description /api/prompts uç noktası ile persona ve şablon listelerini getiren servis.
 */

import { apiFetch } from '#services/apiClient';
import type { PersonaPrompt } from '#types/chat.types';

/**
 * Tenant için tanımlanmış aktif persona ve guardrail promptlarını listeler.
 */
export async function getPrompts(type?: 'system_guardrail' | 'persona' | 'custom'): Promise<PersonaPrompt[]> {
  const query = type ? `?type=${type}` : '';
  const res = await apiFetch<{ success: boolean; data: PersonaPrompt[] }>(`/api/prompts${query}`);
  return res.data;
}
