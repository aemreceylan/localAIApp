/**
 * @file PromptDock.tsx
 * @description Sayfanın altına sabitlenmiş yüzen prompt girdi dock'u.
 * Otomatik yükselen textarea, doküman ekleme (+), şablon/persona seçici, canlı token sayacı ve gönder butonu içerir.
 * @design-token stitch_design_preview.html satır 418-448
 */

import React, { useState, useRef } from 'react';
import { useAutoResizeTextarea } from '#hooks/useAutoResizeTextarea';
import type { PersonaPrompt } from '#types/chat.types';
import { uploadDocument } from '#services/ragService';

export interface PromptDockSendMessageOptions {
  promptId?: string;
  enableRag?: boolean;
  ragDocumentIds?: string[];
}

export interface PromptDockProps {
  onSendMessage: (content: string, options?: PromptDockSendMessageOptions) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  personas?: PersonaPrompt[];
  selectedPersonaId?: string;
  onSelectPersona?: (personaId: string) => void;
  enableRag?: boolean;
  onToggleRag?: () => void;
}

interface AttachedFileItem {
  id?: string;
  name: string;
  isUploading: boolean;
  error?: string | null;
}

export const PromptDock: React.FC<PromptDockProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  personas = [],
  selectedPersonaId,
  onSelectPersona,
  enableRag = true,
  onToggleRag,
}) => {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([]);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { textareaRef } = useAutoResizeTextarea({
    value: input,
    minHeight: 44,
    maxHeight: 180,
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;

    // Yüklemesi tamamlanmış doküman ID'lerini topla
    const completedDocIds = attachedFiles
      .filter((f) => f.id && !f.isUploading && !f.error)
      .map((f) => f.id as string);

    onSendMessage(input.trim(), {
      promptId: selectedPersonaId,
      enableRag,
      ragDocumentIds: completedDocIds.length > 0 ? completedDocIds : undefined,
    });

    setInput('');
    // Gönderimden sonra ekli dosyaları temizle
    setAttachedFiles([]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    for (const file of fileList) {
      const tempItem: AttachedFileItem = {
        name: file.name,
        isUploading: true,
      };

      setAttachedFiles((prev) => [...prev, tempItem]);

      try {
        const title = file.name.replace(/\.[^/.]+$/, '');
        const uploaded = await uploadDocument(file, title);

        setAttachedFiles((prev) =>
          prev.map((item) =>
            item.name === file.name && item.isUploading
              ? { ...item, id: uploaded._id, isUploading: false }
              : item
          )
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Yükleme hatası';
        setAttachedFiles((prev) =>
          prev.map((item) =>
            item.name === file.name && item.isUploading
              ? { ...item, isUploading: false, error: errorMsg }
              : item
          )
        );
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectedPersona = personas.find((p) => p._id === selectedPersonaId);
  const estimatedTokens = Math.max(1, Math.round(input.length / 4));

  return (
    <div className="p-4 bg-gradient-to-t from-white via-white dark:from-slate-950 dark:via-slate-950 to-transparent shrink-0">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-lg p-2.5 flex flex-col gap-2 focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500 transition-all">
        {/* Yüklenen Dosyalar Çip Alanı */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2 pt-1">
            {attachedFiles.map((file, idx) => (
              <span
                key={`${file.name}-${idx}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                  file.error
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    : file.isUploading
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 animate-pulse'
                    : 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800'
                }`}
              >
                {file.isUploading ? (
                  <svg className="animate-spin w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : file.error ? (
                  <span className="text-rose-500 font-bold">!</span>
                ) : (
                  <svg className="w-3 h-3 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span className="truncate max-w-[160px]">{file.name}</span>
                {file.isUploading && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">(Qdrant'a yükleniyor...)</span>}
                {file.id && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">✓</span>}
                <button
                  type="button"
                  onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="hover:text-rose-600 text-slate-400 ml-1 cursor-pointer"
                  title="Kaldır"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Çok Satırlı Otomatik Büyüyen Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Kurumsal bilgi bankasında ara veya modele soru sor... (PDF yüklemek için sol alttaki Doküman Ekle'ye tıkla)"
          className="w-full bg-transparent resize-none text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none px-2 pt-1 leading-relaxed"
        />

        {/* Alt Araç Çubuğu */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 px-1 text-xs">
          {/* Sol Araçlar */}
          <div className="flex items-center gap-2">
            {/* Gizli Dosya Seçici */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.csv,.md"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
              title="Doküman Yükle ve Qdrant Bilgi Bankasına Ekle"
            >
              <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Doküman Ekle</span>
            </button>

            {/* RAG Açık / Kapalı Toggle Butonu */}
            <button
              type="button"
              onClick={onToggleRag}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors border text-xs cursor-pointer ${
                enableRag
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title={enableRag ? 'RAG Bilgi Bankası araması aktif' : 'RAG kapalı, salt model bilgisi'}
            >
              <span className={`w-2 h-2 rounded-full ${enableRag ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              <span>RAG: {enableRag ? 'Açık' : 'Kapalı'}</span>
            </button>

            {/* Şablon & Persona Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPersonaOpen((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedPersona
                    ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 font-semibold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
                title="Persona / Rol Seçimi"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>{selectedPersona ? selectedPersona.title : 'Şablonlar'}</span>
              </button>


              {/* Persona Açılır Popover */}
              {isPersonaOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Persona & Rol Şablonları
                  </div>
                  <div className="space-y-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPersona?.('');
                        setIsPersonaOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                        !selectedPersonaId
                          ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>Varsayılan Persona</span>
                      {!selectedPersonaId && <span>✓</span>}
                    </button>
                    {personas.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => {
                          onSelectPersona?.(p._id);
                          setIsPersonaOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          selectedPersonaId === p._id
                            ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-semibold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{p.title}</span>
                        {selectedPersonaId === p._id && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sağ Araçlar */}
          <div className="flex items-center gap-3">
            {input.trim() && (
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                ~{estimatedTokens} token
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              Shift + Enter yeni satır
            </span>

            {/* Gönder veya Durdur Butonu */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-white"></span>
                <span>Durdur</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:cursor-not-allowed"
              >
                <span>Gönder</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
