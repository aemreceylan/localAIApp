/**
 * @file SideBySide.tsx
 * @description Yan yana çoklu model kıyaslama alanı (Side-by-Side Arena).
 * Tek bir kullanıcı prompt'u ile aynı anda iki farklı modele (ör. bir yerel ve bir bulut model)
 * paralel istek gönderir ve yanıt akışlarını metrikleriyle birlikte canlı kıyaslar.
 * @design-token stitch_design_preview.html satır 517-564
 */

import React, { useState } from 'react';
import type { LLMModel } from '#types/chat.types';
import { PromptDock } from '#components/chat/PromptDock';
import { streamChat } from '#services/chatService';

export interface SideBySideProps {
  availableModels: LLMModel[];
}

export const SideBySide: React.FC<SideBySideProps> = ({ availableModels }) => {
  const [modelA, setModelA] = useState<string>(
    availableModels.find((m) => m.isLocal)?.id || 'llama3.3:70b'
  );
  const [modelB, setModelB] = useState<string>(
    availableModels.find((m) => !m.isLocal)?.id || 'gpt-4o'
  );

  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [metricsA, setMetricsA] = useState<{ latencyMs?: number; tokens?: number }>({});
  const [metricsB, setMetricsB] = useState<{ latencyMs?: number; tokens?: number }>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');

  const handleSendPrompt = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    setLastPrompt(content);
    setResponseA('');
    setResponseB('');
    setMetricsA({});
    setMetricsB({});
    setIsStreaming(true);

    const abortController = new AbortController();

    // Model A isteği
    const streamAPromise = streamChat(
      {
        messages: [{ role: 'user', content }],
        model: modelA,
      },
      {
        onChunk: (chunk) => setResponseA((prev) => prev + chunk),
        onFinish: (_full, meta) => {
          if (meta) setMetricsA(meta);
        },
        onError: (err) => setResponseA((prev) => prev + `\n⚠️ Hata: ${err.message}`),
      },
      abortController.signal
    );

    // Model B isteği
    const streamBPromise = streamChat(
      {
        messages: [{ role: 'user', content }],
        model: modelB,
      },
      {
        onChunk: (chunk) => setResponseB((prev) => prev + chunk),
        onFinish: (_full, meta) => {
          if (meta) setMetricsB(meta);
        },
        onError: (err) => setResponseB((prev) => prev + `\n⚠️ Hata: ${err.message}`),
      },
      abortController.signal
    );

    try {
      await Promise.allSettled([streamAPromise, streamBPromise]);
    } finally {
      setIsStreaming(false);
    }
  };

  const modelAObj = availableModels.find((m) => m.id === modelA) || {
    id: modelA,
    name: modelA,
    isLocal: true,
  };
  const modelBObj = availableModels.find((m) => m.id === modelB) || {
    id: modelB,
    name: modelB,
    isLocal: false,
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Üst Bilgi Barı */}
      <div className="h-12 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
            Yan Yana Çoklu Model Kıyaslama (Side-by-Side Arena)
          </span>
          <span className="text-[10px] bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-medium">
            PRD Faz 2 Özelliği
          </span>
        </div>
        <div className="text-xs text-slate-500 hidden md:inline">
          Aynı prompt her iki modele eş zamanlı gönderilir ve yanıt akışı bölünmüş ekranda canlı izlenir.
        </div>
      </div>

      {/* İki Sütunlu Kıyaslama Izgarası */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto min-h-0">
        {/* Model A Sütunu */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <select
                aria-label="Model A Seçiniz"
                value={modelA}
                onChange={(e) => setModelA(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900">
                    {m.name} ({m.isLocal ? 'Yerel' : 'Bulut'})
                  </option>
                ))}
              </select>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-mono">
                {modelAObj.isLocal ? 'Yerel' : 'Bulut'}
              </span>
            </div>
            {metricsA.latencyMs !== undefined && (
              <span className="text-slate-400 font-mono text-[11px]">
                Gecikme: {metricsA.latencyMs}ms
              </span>
            )}
          </div>

          <div className="p-4 flex-1 text-xs space-y-3 leading-relaxed text-slate-700 dark:text-slate-300 overflow-y-auto">
            {lastPrompt && (
              <div className="text-[11px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                <strong>İstem:</strong> {lastPrompt}
              </div>
            )}
            <div className="whitespace-pre-wrap">{responseA || (isStreaming ? 'Yanıt akıyor...' : 'Prompt bekleniyor...')}</div>
          </div>

          {metricsA.tokens !== undefined && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-500 flex justify-between">
              <span>Token: {metricsA.tokens}</span>
              <span>Hız: ~64 tok/s</span>
            </div>
          )}
        </div>

        {/* Model B Sütunu */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <select
                aria-label="Model B Seçiniz"
                value={modelB}
                onChange={(e) => setModelB(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900">
                    {m.name} ({m.isLocal ? 'Yerel' : 'Bulut'})
                  </option>
                ))}
              </select>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-mono">
                {modelBObj.isLocal ? 'Yerel' : 'Bulut'}
              </span>
            </div>
            {metricsB.latencyMs !== undefined && (
              <span className="text-slate-400 font-mono text-[11px]">
                Gecikme: {metricsB.latencyMs}ms
              </span>
            )}
          </div>

          <div className="p-4 flex-1 text-xs space-y-3 leading-relaxed text-slate-700 dark:text-slate-300 overflow-y-auto">
            {lastPrompt && (
              <div className="text-[11px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                <strong>İstem:</strong> {lastPrompt}
              </div>
            )}
            <div className="whitespace-pre-wrap">{responseB || (isStreaming ? 'Yanıt akıyor...' : 'Prompt bekleniyor...')}</div>
          </div>

          {metricsB.tokens !== undefined && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-500 flex justify-between">
              <span>Token: {metricsB.tokens}</span>
              <span>Maliyet: ~$0.0035</span>
            </div>
          )}
        </div>
      </div>

      {/* Alt Paylaşımlı Prompt Dock */}
      <PromptDock
        onSendMessage={handleSendPrompt}
        isStreaming={isStreaming}
        onStopStreaming={() => setIsStreaming(false)}
      />
    </div>
  );
};
