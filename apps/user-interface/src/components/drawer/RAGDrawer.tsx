/**
 * @file RAGDrawer.tsx
 * @description Çift aşamalı (Sıkıştırma + Overlay) RAG Doküman Önizleme Çekmecesi.
 * Genişletildikçe sohbetin üzerine pürüzsüz taşar; sol kenardan tutularak boyutlandırılır.
 * @design-token stitch_design_preview.html satır 451-512 & 1202-1236
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CitationItem, RagCitation, RAGDocument } from '#types/rag.types';
import { CitationCard } from '#components/drawer/CitationCard';
import { getDocuments } from '#services/ragService';

export interface RAGDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResizerMouseDown: (e: React.MouseEvent) => void;
  citations?: (CitationItem | RagCitation)[];
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
  const [activeTab, setActiveTab] = useState<'citations' | 'documents'>('citations');
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Dokümanlar sekmesi açıldığında belgeleri sunucudan getir
  const loadDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const data = await getDocuments();
      setDocuments(data?.documents || []);
    } catch (err) {
      console.warn('[RAGDrawer] Dokümanlar yüklenirken uyarı:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'documents') {
      loadDocuments();
    }
  }, [isOpen, activeTab, loadDocuments]);

  // Yeni alıntı geldiğinde sekmeyi otomatik Alıntılar'a çek
  useEffect(() => {
    if (citations.length > 0) {
      setActiveTab('citations');
    }
  }, [citations.length]);

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
      <button
        type="button"
        id="inspectorResizer"
        aria-label="RAG paneli genişlik ayarlayıcı"
        onMouseDown={onResizerMouseDown}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
          }
        }}
        className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize select-none z-40 flex items-center justify-center group hover:bg-brand-500/20 active:bg-brand-500/40 transition-colors p-0 border-0 bg-transparent"
        title="Sürükleyerek RAG paneli genişliğini ayarlayın (Genişledikçe Sohbetin Üzerine Geçer)"
      >
        <span className="w-1 h-8 bg-slate-300 dark:bg-slate-700 rounded-full group-hover:bg-brand-500 group-hover:h-14 transition-all shadow-sm block"></span>
      </button>

      {/* Üst Başlık Çubuğu */}
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
              Overlay
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

      {/* Sekme Seçici (Tabs) */}
      <div className="px-4 pt-2 border-b border-slate-200 dark:border-slate-800 flex gap-2 shrink-0 bg-white/50 dark:bg-slate-900/50">
        <button
          type="button"
          onClick={() => setActiveTab('citations')}
          className={`pb-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'citations'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <span>Aktif Alıntılar</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {citations.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`pb-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'documents'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <span>Bilgi Bankası</span>
          {documents.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {documents.length}
            </span>
          )}
        </button>
      </div>

      {/* Sekme 1: Aktif Alıntılar */}
      {activeTab === 'citations' && (
        <div className="p-4 flex flex-col gap-3.5 flex-1 min-h-0 overflow-y-auto">
          {citations.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 space-y-2">
              <svg className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Son asistan yanıtına ait doğrulanmış bir RAG alıntısı henüz bulunmuyor.</p>
              <p className="text-[11px] text-slate-500">RAG Bilgi Bankası açıkken soru sorduğunuzda kaynaklar burada otomatik listelenir.</p>
            </div>
          ) : (
            citations.map((cite, idx) => {
              const citeId = 'id' in cite ? cite.id : `cite-${idx + 1}`;
              return (
                <CitationCard
                  key={citeId}
                  citation={cite}
                  index={idx}
                  isSelected={String(selectedCitationId) === String(citeId)}
                  onOpenDocument={onOpenDocument}
                />
              );
            })
          )}
        </div>
      )}

      {/* Sekme 2: Kayıtlı Bilgi Bankası Dokümanları */}
      {activeTab === 'documents' && (
        <div className="p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Yüklü Dokümanlar</span>
            <button
              type="button"
              onClick={loadDocuments}
              className="hover:text-brand-600 flex items-center gap-1 transition-colors text-[11px]"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Yenile</span>
            </button>
          </div>

          {isLoadingDocs ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Dokümanlar yükleniyor...
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 space-y-1.5">
              <p>Henüz sisteme yüklenmiş bir doküman bulunamadı.</p>
              <p className="text-[11px] text-slate-500">Aşağıdaki prompt dock'undan + butonu ile PDF yükleyebilirsiniz.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc._id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2 text-xs hover:border-brand-500/50 transition-colors shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={doc.title}>
                      {doc.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {(doc.file_size / 1024).toFixed(1)} KB • {doc.mime_type?.split('/')[1] || 'pdf'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                      doc.status === 'completed'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : doc.status === 'processing'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {doc.status === 'completed'
                      ? 'Tamamlandı'
                      : doc.status === 'processing'
                      ? 'İşleniyor'
                      : 'Hata'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60 font-mono">
                  <span>Chunk: <strong>{doc.chunk_count}</strong></span>
                  <span>Roller: <strong>{doc.allowed_roles?.join(', ') || 'Tümü'}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Alt Bilgi */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center font-mono shrink-0 flex items-center justify-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span>Qdrant Hybrid Search (Dense Cosine + Sparse BM25)</span>
      </div>
    </aside>
  );
};

