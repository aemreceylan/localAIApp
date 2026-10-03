/**
 * @file MessageBubble.tsx
 * @description Kullanıcı ve AI asistan mesaj balonları.
 * Markdown başlıkları, listeleri, JetBrains Mono kopyalanabilir kod bloklarını ve
 * tıklanabilir [1] RAG dipnot rozetlerini destekler.
 * @design-token stitch_design_preview.html satır 348-415
 */

import React, { useState } from 'react';
import type { ChatMessage } from '#types/chat.types';

export interface MessageBubbleProps {
  message: ChatMessage;
  userName?: string;
  isStreaming?: boolean;
  onOpenCitation?: (citationId: string | number) => void;
  onRegenerate?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  userName = 'Ahmet Emre',
  isStreaming = false,
  onOpenCitation,
  onRegenerate,
}) => {
  const isUser = message.role === 'user';
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const handleCopyMessage = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message.content);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 1500);
    }
  };

  const handleCopyCode = (code: string, index: number) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeIndex(index);
      setTimeout(() => setCopiedCodeIndex(null), 1500);
    }
  };

  // 1. KULLANICI MESAJI (Sağa Yaslı)
  if (isUser) {
    return (
      <div className="flex gap-3 justify-end group">
        <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-xl shadow-sm leading-relaxed">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <div className="text-[10px] text-brand-200 mt-1.5 text-right font-mono">
            {message.createdAt} • {userName}
          </div>
        </div>
      </div>
    );
  }

  // 2. ASİSTAN MESAJI (Sola Yaslı, RAG & Kod Bloklu)
  return (
    <div className="flex gap-3.5 group">
      {/* AI Logosu / Avatarı */}
      <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-bold text-xs flex items-center justify-center shrink-0 mt-1 shadow-sm">
        AI
      </div>

      <div className="space-y-3 max-w-2xl text-sm leading-relaxed min-w-0 flex-1">
        {/* Üst Bilgi Başlığı */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 dark:text-white text-xs">Nexus AI</span>
          {message.model && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
              {message.model.includes('/') ? message.model.split('/')[1] : message.model}
            </span>
          )}
          {message.metrics && (
            <span className="text-[10px] text-slate-400 font-mono">
              {message.metrics.latencyMs ? `${(message.metrics.latencyMs / 1000).toFixed(1)}s` : ''}
              {message.metrics.tokens ? ` • ${message.metrics.tokens} token` : ''}
            </span>
          )}
        </div>

        {/* Mesaj İçeriği ve Biçimlendirme */}
        <div className="text-slate-700 dark:text-slate-300 space-y-2.5">
          {!message.content ? (
            /* LLM'den ilk token gelene kadar metnin geleceği yerde yükleniyor animasyonu */
            <div className="flex items-center gap-2 py-1 select-none">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse [animation-delay:200ms]"></span>
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse [animation-delay:400ms]"></span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Yanıt hazırlanıyor...
                </span>
              </div>
            </div>
          ) : (
            <>
              {renderContentWithFormatting(message.content, onOpenCitation, handleCopyCode, copiedCodeIndex)}
              {isStreaming && (
                <span
                  className="inline-block w-1.5 h-4 ml-1 -mb-0.5 bg-brand-500 animate-pulse rounded-xs"
                  aria-hidden="true"
                />
              )}
            </>
          )}
        </div>

        {/* Backend Qdrant'tan Doğrulanmış Kaynak Alıntıları (Citations) */}
        {message.citations && message.citations.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="text-brand-600 dark:text-brand-400">§</span>
              <span>Kullanılan Kaynaklar ({message.citations.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.citations.map((cite, idx) => (
                <button
                  key={`${cite.documentId}-${cite.chunkIndex}-${idx}`}
                  type="button"
                  onClick={() => onOpenCitation?.(`cite-${idx + 1}`)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 text-[11px] transition-colors group cursor-pointer"
                  title={`${cite.documentTitle || 'Doküman'} (Eşleşme: %${Math.round(cite.score * 100)})`}
                >
                  <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">[{idx + 1}]</span>
                  <span className="max-w-[130px] truncate">{cite.documentTitle || 'Doküman'}</span>
                  {cite.pageNumber !== undefined && cite.pageNumber !== null && (
                    <span className="text-slate-400 text-[10px] font-mono">s.{cite.pageNumber}</span>
                  )}
                  <span className="text-[10px] font-mono px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                    %{Math.round(cite.score * 100)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alt Aksiyon Butonları (Yalnızca içerik varsa gösterilir) */}
        {message.content && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 select-none">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copiedMessage ? 'Kopyalandı!' : 'Kopyala'}</span>
            </button>

            {onRegenerate && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Yeniden Üret</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * İçerikteki kod bloklarını ve [1] RAG referans rozetlerini süzerek render eder.
 */
function renderContentWithFormatting(
  rawText: string,
  onOpenCitation?: (id: string | number) => void,
  onCopyCode?: (code: string, index: number) => void,
  copiedCodeIndex?: number | null
): React.ReactNode {
  if (!rawText) return null;

  // Kod bloklarını tespit et (```lang ... ```)
  const codeBlockRegex = /```([a-zA-Z0-9_\-.]*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let codeIndex = 0;

  while ((match = codeBlockRegex.exec(rawText)) !== null) {
    // Kod bloğundan önceki normal metin
    if (match.index > lastIndex) {
      const textChunk = rawText.substring(lastIndex, match.index);
      parts.push(
        <div key={`text-${lastIndex}`}>{renderTextWithCitations(textChunk, onOpenCitation)}</div>
      );
    }

    const language = match[1] || 'kod';
    const codeContent = match[2] || '';
    const currentIndex = codeIndex++;

    parts.push(
      <div
        key={`code-${match.index}`}
        className="rounded-lg bg-slate-900 text-slate-100 border border-slate-800 overflow-hidden font-mono text-xs my-2.5 shadow-sm"
      >
        <div className="px-4 py-1.5 bg-slate-800/80 flex justify-between items-center text-[11px] text-slate-400 border-b border-slate-700/60 select-none">
          <span>{language}</span>
          <button
            type="button"
            onClick={() => onCopyCode?.(codeContent, currentIndex)}
            className="hover:text-white transition-colors"
          >
            {copiedCodeIndex === currentIndex ? 'Kopyalandı!' : 'Kopyala'}
          </button>
        </div>
        <pre className="p-3.5 overflow-x-auto text-[11px] font-mono leading-relaxed">
          <code>{codeContent}</code>
        </pre>
      </div>
    );

    lastIndex = codeBlockRegex.lastIndex;
  }

  // Kalan son metin parçası
  if (lastIndex < rawText.length) {
    const remainingText = rawText.substring(lastIndex);
    parts.push(
      <div key={`text-end`}>{renderTextWithCitations(remainingText, onOpenCitation)}</div>
    );
  }

  return parts;
}

/**
 * Metin içindeki [1] dokuman.pdf (s. 14) şeklindeki RAG referanslarını ve **kalın** metinleri işler.
 */
function renderTextWithCitations(
  text: string,
  onOpenCitation?: (id: string | number) => void
): React.ReactNode {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        const isListItem = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const lineContent = isListItem ? trimmed.substring(2) : line;

        const renderedLine = parseCitationsAndBold(lineContent, `l-${lineIdx}`, onOpenCitation);
        const lineKeyFragment = trimmed
          ? trimmed.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')
          : `blank_${line.length}`;

        if (isListItem) {
          return (
            <div key={`li-${lineIdx}-${lineKeyFragment}`} className="flex items-start gap-2 pl-2">
              <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0 mt-0.5">•</span>
              <div className="flex-1 min-w-0">{renderedLine}</div>
            </div>
          );
        }

        if (!trimmed) {
          return <div key={`empty-${lineKeyFragment}-${lineIdx}`} className="h-1.5" />;
        }

        return <p key={`p-${lineIdx}-${lineKeyFragment}`} className="leading-relaxed">{renderedLine}</p>;
      })}
    </div>
  );
}

function parseCitationsAndBold(
  text: string,
  keyPrefix: string,
  onOpenCitation?: (id: string | number) => void
): React.ReactNode[] {
  const citationRegex = /\[(\d+)\](?: ([^(\r\n]+))?(?: \((s\.\s*\d+)\))?/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = citationRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = text.substring(lastIndex, match.index);
      elements.push(...renderBoldTokens(textChunk, `${keyPrefix}-t-${lastIndex}`));
    }

    const citationNum = match[1];
    const filename = match[2]?.trim();
    const page = match[3];

    elements.push(
      <button
        key={`${keyPrefix}-cite-${match.index}`}
        type="button"
        onClick={() => onOpenCitation?.(citationNum)}
        className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono text-[11px] hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors align-baseline"
      >
        <span>[{citationNum}]</span>
        {filename && <span>{filename}</span>}
        {page && <span className="opacity-75">({page})</span>}
      </button>
    );

    lastIndex = citationRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(...renderBoldTokens(text.substring(lastIndex), `${keyPrefix}-end`));
  }

  return elements;
}

function renderBoldTokens(chunk: string, keyPrefix: string): React.ReactNode[] {
  const parts = chunk.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

