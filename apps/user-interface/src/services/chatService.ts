/**
 * @file chatService.ts
 * @description /api/chat ve /api/chat/sessions uç noktaları ile haberleşen servis katmanı.
 * Vercel AI SDK Data Stream protokolünü ve SSE akışını tüketir.
 */

import { apiFetch } from '#services/apiClient';
import type { ChatMessage, ChatSession } from '#types/chat.types';

export interface SendMessagePayload {
  conversationId?: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model: string;
  promptId?: string;
  customInstructions?: string;
  temperature?: number;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onFinish?: (fullText: string, metadata?: { latencyMs?: number; tokens?: number }) => void;
  onError?: (error: Error) => void;
}

/**
 * Vercel AI SDK Data Stream satırındaki token'ı çözer.
 */
function parseVercelDataToken(raw: string): string {
  try {
    const token = JSON.parse(raw);
    return typeof token === 'string' ? token : raw;
  } catch {
    return raw;
  }
}

/**
 * Klasik SSE formatındaki veri satırını çözer.
 */
function parseSseDataToken(raw: string): string | null {
  if (raw === '[DONE]') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.text || raw;
  } catch {
    return raw;
  }
}

/**
 * Gelen akış satırından metin token'ını ayıklar.
 */
function extractTokenFromLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('0:')) {
    return parseVercelDataToken(trimmed.substring(2));
  }
  if (trimmed.startsWith('data:')) {
    return parseSseDataToken(trimmed.substring(5).trim());
  }
  return null;
}

/**
 * Hata yanıtından açıklayıcı hata iletisini çıkarır.
 */
async function extractErrorMessage(response: Response): Promise<string> {
  const fallbackMessage = `Sunucu hatası (${response.status})`;
  try {
    const errorData = await response.json();
    return errorData.error?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

/**
 * Backend /api/chat uç noktasına canlı streaming isteği atar.
 * Vercel AI SDK Data Stream protokolünü (0:"token") çözümleyerek onChunk geri çağrısına iletir.
 */
export async function streamChat(
  payload: SendMessagePayload,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const tenantId =
    (typeof window !== 'undefined' && window.localStorage !== undefined
      ? window.localStorage.getItem('nexus_tenant_id')
      : null) || 'default-tenant';
  const token =
    typeof window !== 'undefined' && window.localStorage !== undefined
      ? window.localStorage.getItem('nexus_token')
      : null;
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response);
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error('Yanıtta okunabilir akış (ReadableStream) bulunamadı.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponseText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Tamamlanmamış son satırı sakla

      for (const line of lines) {
        const token = extractTokenFromLine(line);
        if (token) {
          fullResponseText += token;
          callbacks.onChunk(token);
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    callbacks.onFinish?.(fullResponseText, {
      latencyMs,
      tokens: Math.round(fullResponseText.length / 4),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return;
    }
    callbacks.onError?.(error as Error);
  }
}

/**
 * Yeni bir sohbet oturumu oluşturur.
 */
export async function createSession(data: {
  title?: string;
  model: string;
  promptId?: string;
  customInstructions?: string;
}): Promise<ChatSession> {
  const res = await apiFetch<{ success: boolean; data: ChatSession }>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

/**
 * Kayıtlı tüm sohbet oturumlarını getirir.
 */
export async function getSessions(): Promise<ChatSession[]> {
  const res = await apiFetch<{ success: boolean; data: ChatSession[] }>('/api/chat/sessions');
  return res.data;
}

/**
 * Belirli bir oturumun mesaj geçmişini getirir.
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await apiFetch<{ success: boolean; data: ChatMessage[] }>(
    `/api/chat/sessions/${sessionId}/messages`
  );
  return res.data;
}

/**
 * Bir sohbet oturumunu siler.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await apiFetch<{ success: boolean; message: string }>(`/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}
