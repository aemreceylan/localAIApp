/**
 * @file ChatHeader.tsx
 * @description Sohbet akışının üst barı: Model seçici dropdown, aktif bilgi bankası havuzu,
 * kıyaslama kısayolu, paylaşım ve RAG çekmece açma butonları.
 * @design-token stitch_design_preview.html satır 311-346
 */

import React from 'react';
import { Dropdown, type DropdownItem } from '#components/ui/Dropdown';
import type { LLMModel } from '#types/chat.types';

export interface ChatHeaderProps {
  isSidebarCollapsed: boolean;
  onExpandSidebar: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  availableModels: LLMModel[];
  isModelsLoading?: boolean;
  sessionTitle?: string;
  connectedKnowledgeBase?: {
    name: string;
    docCount?: number;
  } | null;
  onShareChat: () => void;
  isRAGOpen: boolean;
  onToggleRAG: () => void;
  ragCount?: number;
}

function resolveModelDisplayName(modelId: string, isLoading: boolean): string {
  if (modelId) {
    return modelId.includes('/') ? modelId.split('/')[1] : modelId;
  }
  return isLoading ? 'Modeller Yükleniyor...' : 'Model Seçiniz';
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isSidebarCollapsed,
  onExpandSidebar,
  selectedModel,
  onSelectModel,
  availableModels,
  isModelsLoading = false,
  sessionTitle = 'Yeni Sohbet',
  connectedKnowledgeBase,
  onShareChat,
  isRAGOpen,
  onToggleRAG,
  ragCount = 0,
}) => {
  const currentModel = availableModels.find(
    (m) => m.id === selectedModel || m.name === selectedModel
  ) || {
    id: selectedModel,
    name: resolveModelDisplayName(selectedModel, isModelsLoading),
    provider: 'ollama' as const,
    isLocal: true,
  };

  const dropdownItems: DropdownItem[] = availableModels.map((m) => ({
    id: m.id,
    label: m.name,
    badge: m.isLocal ? 'Yerel' : 'Bulut',
    description: m.description,
    onClick: () => onSelectModel(m.id),
  }));

  return (
    <div className="h-13 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shrink-0 z-10 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {/* Kenar Çubuğu Daraltıldığında Gözüken Aç Butonu */}
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={onExpandSidebar}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm shrink-0"
            title="Kenar Çubuğunu Aç (Ctrl+B)"
            aria-label="Kenar Çubuğunu Aç"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Model Seçici Dropdown */}
        <Dropdown
          items={dropdownItems}
          trigger={
            <div className="flex items-center gap-2 bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none">
              {isModelsLoading ? (
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
              ) : (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    currentModel.isLocal ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                ></span>
              )}
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px] sm:max-w-[170px]">
                {currentModel.name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/70 px-1.5 py-0.5 rounded font-mono shrink-0">
                {currentModel.isLocal ? 'Yerel' : 'Bulut'}
              </span>
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          }
        />

        <span className="text-xs text-slate-300 dark:text-slate-700 hidden md:inline">|</span>

        {/* Aktif Oturum veya Bilgi Bankası Başlığı */}
        <div className="hidden md:flex items-center gap-2 text-xs truncate">
          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
            {sessionTitle}
          </span>
          {connectedKnowledgeBase && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0">
              <span>•</span>
              <span className="text-brand-600 dark:text-brand-400 font-medium">
                {connectedKnowledgeBase.name}
              </span>
              {connectedKnowledgeBase.docCount !== undefined && (
                <span>({connectedKnowledgeBase.docCount} Doküman)</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Sağ Aksiyon Butonları */}
      <div className="flex items-center gap-2 text-xs shrink-0">
        {/* Sohbeti Paylaş */}
        <button
          type="button"
          onClick={onShareChat}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="Sohbeti Bağlantı Olarak Paylaş"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </button>

        {/* Sağ RAG Çekmecesini Aç/Kapa */}
        <button
          type="button"
          onClick={onToggleRAG}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
            isRAGOpen
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/50'
          }`}
          title="Kaynak Önizleme Çekmecesi"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden sm:inline">RAG Kaynakları</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
              isRAGOpen
                ? 'bg-brand-700 text-white'
                : 'bg-brand-200 dark:bg-brand-800 text-brand-800 dark:text-brand-200'
            }`}
          >
            {ragCount}
          </span>
        </button>
      </div>
    </div>
  );
};
