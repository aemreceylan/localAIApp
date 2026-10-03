/**
 * @file CitationCard.tsx
 * @description RAG kaynak kartı: Benzerlik skoru (% eşleşme), Chunk ID, sayfa numarası ve
 * sarı <mark> vurgulu orijinal doküman kesiti.
 * @design-token stitch_design_preview.html satır 473-506
 */

import React from 'react';
import type { CitationItem, RagCitation } from '#types/rag.types';

export interface CitationCardProps {
  citation: CitationItem | RagCitation;
  index?: number;
  isSelected?: boolean;
  onOpenDocument?: (docId: string) => void;
}

const CitationCardComponent: React.FC<CitationCardProps> = ({
  citation,
  index = 0,
  isSelected = false,
  onOpenDocument,
}) => {
  // CitationItem vs RagCitation polimorfik alan çözümlemesi
  const isItem = 'filename' in citation && 'similarityPercentage' in citation;

  const cardId = isItem
    ? (citation as CitationItem).id
    : `cite-${index + 1}`;

  const documentTitle = isItem
    ? (citation as CitationItem).filename
    : (citation as RagCitation).documentTitle ||
      ((citation as RagCitation).metadata?.fileName as string) ||
      `Doküman #${citation.documentId.slice(-6)}`;

  const similarity = isItem
    ? (citation as CitationItem).similarityPercentage
    : Math.round((citation as RagCitation).score * 100);

  const vectorScore = isItem
    ? (citation as CitationItem).vectorScore
    : (citation as RagCitation).score;

  const excerptText = isItem
    ? (citation as CitationItem).excerpt
    : (citation as RagCitation).text;

  const highlightedTerm = isItem
    ? (citation as CitationItem).highlightedTerm
    : undefined;

  const pageNumber = citation.pageNumber;
  const chunkIndex = citation.chunkIndex;

  return (
    <div
      id={`citation-${cardId}`}
      className={`bg-white dark:bg-slate-800 border rounded-xl p-3.5 space-y-3 shadow-xs transition-all duration-200 ${
        isSelected
          ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {/* Üst Başlık ve Benzerlik Rozeti */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
            [{index + 1}]
          </span>
          <span
            className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
            title={documentTitle}
          >
            {documentTitle}
          </span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold shrink-0 ${
            similarity >= 85
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              : similarity >= 65
              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
          }`}
        >
          %{similarity} Eşleşme
        </span>
      </div>

      {/* Üst Veri Tablosu */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 border-y border-slate-100 dark:border-slate-700/60 py-2">
        {pageNumber !== undefined && pageNumber !== null && (
          <div>
            Sayfa No: <strong className="text-slate-700 dark:text-slate-200 font-mono">{pageNumber}</strong>
          </div>
        )}
        <div>
          Chunk No: <strong className="text-slate-700 dark:text-slate-200 font-mono">#{chunkIndex}</strong>
        </div>
        <div>
          Kosinüs Skoru: <strong className="text-slate-700 dark:text-slate-200 font-mono">{vectorScore.toFixed(4)}</strong>
        </div>
        <div>
          Vektör DB: <strong className="text-brand-600 dark:text-brand-400 font-mono">Qdrant</strong>
        </div>
      </div>

      {/* Alıntılanan Metin Parçası */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
        <p className="line-clamp-5 whitespace-pre-wrap">
          {renderSafeHighlightedExcerpt(excerptText, highlightedTerm)}
        </p>
      </div>

      {/* Doküman Aksiyon Butonu */}
      {citation.documentId && (
        <button
          type="button"
          onClick={() => onOpenDocument?.(citation.documentId)}
          className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          <span>Doküman Detayını Görüntüle</span>
        </button>
      )}
    </div>
  );
};

export const CitationCard = React.memo(CitationCardComponent);


/**
 * HTML enjeksiyonu ve dangerouslySetInnerHTML riskini önlemek için metin kesitini
 * saf React bileşenleri ile güvenli biçimde vurgular (SonarQube Security S6035).
 */
function renderSafeHighlightedExcerpt(text: string, term?: string): React.ReactNode {
  if (!term || !text) return text;

  // Regex özel karakterlerini kaçır (ReDoS ve regex injection önleme)
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === term.toLowerCase()) {
      return (
        <mark key={`mark-${index}-${part}`} className="bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 px-1 rounded">
          {part}
        </mark>
      );
    }
    return part;
  });
}

