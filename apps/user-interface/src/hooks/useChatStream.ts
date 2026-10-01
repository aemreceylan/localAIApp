/**
 * @file useChatStream.ts
 * @description SSE ve Vercel AI SDK Data Stream protokolünü tüketen, mesaj geçmişini ve
 * gerçek zamanlı asistan yanıt akışını re-render optimizasyonuyla yöneten saf React kancası.
 */

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '#types/chat.types';
import { streamChat } from '#services/chatService';

export interface UseChatStreamOptions {
  conversationId?: string;
  initialMessages?: ChatMessage[];
  defaultModel?: string;
}

export interface SendMessageOptions {
  conversationId?: string;
  model?: string;
  promptId?: string;
  customInstructions?: string;
  citations?: string[];
}

export function useChatStream({
  conversationId,
  initialMessages = [],
  defaultModel = '',
}: UseChatStreamOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, options: SendMessageOptions = {}) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `asst-${Date.now() + 1}`;
      const activeModel = options.model || defaultModel;

      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const assistantPlaceholder: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: activeModel,
        citations: options.citations || [],
      };

      // Kullanıcı mesajı ve boş asistan mesajını listeye ekle
      setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
      setIsStreaming(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Backend'e iletilecek geçmiş (Son N mesaj)
      const outgoingMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const targetConversationId = options.conversationId || conversationId;

      await streamChat(
        {
          conversationId: targetConversationId,
          messages: outgoingMessages,
          model: activeModel,
          promptId: options.promptId,
          customInstructions: options.customInstructions,
        },
        {
          onChunk: (token) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + token }
                  : msg
              )
            );
          },
          onFinish: (_fullText, metadata) => {
            setIsStreaming(false);
            abortControllerRef.current = null;
            if (metadata) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        metrics: {
                          latencyMs: metadata.latencyMs,
                          tokens: metadata.tokens,
                        },
                      }
                    : msg
                )
              );
            }
          },
          onError: (err) => {
            setIsStreaming(false);
            abortControllerRef.current = null;
            setError(err.message);
            // Hata mesajını asistan balonuna da not düş
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content:
                        msg.content ||
                        `⚠️ Bir hata oluştu: ${err.message}. Lütfen model bağlantınızı kontrol edin.`,
                    }
                  : msg
              )
            );
          },
        },
        abortController.signal
      );
    },
    [conversationId, defaultModel, isStreaming, messages]
  );

  const clearMessages = useCallback(() => {
    abort();
    setMessages([]);
    setError(null);
  }, [abort]);

  return {
    messages,
    setMessages,
    isStreaming,
    error,
    sendMessage,
    abort,
    clearMessages,
  };
}
