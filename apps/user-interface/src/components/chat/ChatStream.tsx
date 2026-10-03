/**
 * @file ChatStream.tsx
 * @description Mesaj geçmişi akış kapsayıcısı ve alt prompt dock'u birleşimi.
 * Otomatik aşağı kaydırma ve başlangıç öneri kartlarını yönetir.
 * @design-token stitch_design_preview.html satır 348-448
 */

import React, { useEffect, useRef } from 'react';
import type { ChatMessage, PersonaPrompt } from '#types/chat.types';
import { MessageBubble } from '#components/chat/MessageBubble';
import { PromptDock, type PromptDockSendMessageOptions } from '#components/chat/PromptDock';

export interface ChatStreamProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (content: string, options?: PromptDockSendMessageOptions) => void;
  onStopStreaming: () => void;
  onOpenCitation?: (citationId: string | number) => void;
  onRegenerate?: () => void;
  personas?: PersonaPrompt[];
  selectedPersonaId?: string;
  onSelectPersona?: (personaId: string) => void;
  enableRag?: boolean;
  onToggleRag?: () => void;
}

const STARTER_PROMPTS = [
  '2026 yılı kurumsal bulut yedekleme sözleşmesindeki veri saklama süresi ve üçüncü taraf transfer şartları nelerdir? Bilgi bankasındaki güncel PDF\'e göre özetler misin?',
  'KVKK kapsamında veri sorumlusu sıfatıyla yurt dışına veri aktarımı taahhütnamesi maddelerini karşılaştır.',
  'Qdrant vektör veritabanında saklanan hibrit arama koleksiyonlarının sayfa numarası ve chunk skorlarını listele.',
];

export const ChatStream: React.FC<ChatStreamProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onOpenCitation,
  onRegenerate,
  personas = [],
  selectedPersonaId,
  onSelectPersona,
  enableRag = true,
  onToggleRag,
}) => {

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Yeni mesaj veya token geldiğinde pürüzsüz aşağı kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
      {/* Mesaj Akış Alanı (Dikey scroll tam sağ kenarda) */}
      <div className="flex-1 overflow-y-auto w-full min-h-0">
        <div className="max-w-4xl mx-auto p-6 space-y-6 min-h-full flex flex-col justify-center">
          {/* Karşılama ve Boş Durum Ekranı */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/50 text-brand-600 dark:text-brand-300 flex items-center justify-center font-bold text-xl shadow-sm border border-brand-200 dark:border-brand-800">
                NX
              </div>
              <div className="max-w-md space-y-1.5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  NexusAI Kurumsal Asistan
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Yerel açık kaynak LLM'ler ve RAG Bilgi Bankası ile güvenli ve hızlı kurumsal analiz gerçekleştirin.
                </p>
              </div>

              {/* Öneri Prompt Kartları */}
              <div className="grid grid-cols-1 gap-2.5 w-full max-w-xl text-left">
                {STARTER_PROMPTS.map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSendMessage(promptText)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 hover:border-brand-500/50 text-xs text-slate-700 dark:text-slate-300 transition-all text-left flex items-start gap-2.5 shadow-sm group"
                  >
                    <span className="text-brand-600 dark:text-brand-400 font-bold">›</span>
                    <span className="line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {promptText}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mesaj Listesi */}
          {messages.length > 0 && (
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && index === messages.length - 1}
                  onOpenCitation={onOpenCitation}
                  onRegenerate={msg.role === 'assistant' ? onRegenerate : undefined}
                />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Alt Yüzen Prompt Dock */}
      <PromptDock
        onSendMessage={onSendMessage}
        isStreaming={isStreaming}
        onStopStreaming={onStopStreaming}
        personas={personas}
        selectedPersonaId={selectedPersonaId}
        onSelectPersona={onSelectPersona}
        enableRag={enableRag}
        onToggleRag={onToggleRag}
      />
    </div>
  );
};

