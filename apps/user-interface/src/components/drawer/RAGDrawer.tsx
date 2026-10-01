/**
 * @file RAGDrawer.tsx
 * @description Çift aşamalı (Sıkıştırma + Overlay) RAG Doküman Önizleme Çekmecesi.
 * Genişletildikçe sohbetin üzerine pürüzsüz taşar; sol kenardan tutularak boyutlandırılır.
 * @design-token stitch_design_preview.html satır 451-512 & 1202-1236
 */

import React, { useRef } from 'react';
import type { CitationItem } from '#types/rag.types';
import { CitationCard } from '#components/drawer/CitationCard';

export interface RAGDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResizerMouseDown: (e: React.MouseEvent) => void;
  citations?: CitationItem[];
  selectedCitationId?: string | number | null;
  onOpenDocument?: (docId: string) => void;
  isOverlay?: boolean;
}

export const RAGDrawer: React.FC<RAGDrawerProps> = ({
  isOpen,
  onClose,
  width,
  onResizerMouseDown,
  citations = [],
  selectedCitationId,
  onOpenDocument,
  isOverlay = false,
}) => {
  const drawerRef = useRef<HTMLElement>(null);

  if (!isOpen) return null;

  return (
    <aside
      ref={drawerRef}
      id="inspectorDrawer"
      className={`absolute right-0 top-0 bottom-0 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-[box-shadow,border-color] duration-150 ${
        isOverlay
          ? 'z-30 shadow-2xl ring-1 ring-slate-900/10 dark:ring-slate-100/10'
          : 'z-20'
      }`}
      style={{ width }}
    >
      {/* RAG INSPECTOR BOYUT AYARLAMA TUTAMACI (SOL KENAR) */}
      <div
        id="inspectorResizer"
        onMouseDown={onResizerMouseDown}
        className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize select-none z-40 flex items-center justify-center group hover:bg-brand-500/20 active:bg-brand-500/40 transition-colors"
        title="Sürükleyerek RAG paneli genişliğini ayarlayın (Genişledikçe Sohbetin Üzerine Geçer)"
      >
        <div className="w-1 h-8 bg-slate-300 dark:bg-slate-700 rounded-full group-hover:bg-brand-500 group-hover:h-14 transition-all shadow-sm"></div>
      </div>

      {/* Başlık Çubuğu */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs shadow-sm">
            §
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            RAG Kaynak Denetçisi
          </h3>
          {isOverlay && (
            <span
              id="overlayBadge"
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
            >
              Üzerine Açık
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          title="Kapat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Kaynak Kartları Listesi */}
      <div className="p-4 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
        {citations.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Bu oturuma bağlı henüz RAG kaynağı bulunmuyor.
          </div>
        ) : (
          citations.map((cite) => (
            <CitationCard
              key={cite.id}
              citation={cite}
              isSelected={String(selectedCitationId) === String(cite.id)}
              onOpenDocument={onOpenDocument}
            />
          ))
        )}
      </div>

      {/* Alt Bilgi */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center font-mono shrink-0">
        Qdrant Hybrid Search (Dense + Sparse BM25)
      </div>
    </aside>
  );
};
