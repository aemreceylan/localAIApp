/**
 * @file AppearanceModal.tsx
 * @description Görünüm ve Tema Ayarları Modalı (Derin Ayar İlkesi).
 * Renk paletleri ana ekranda kalabalık yapmaz; bu modal üzerinden seçilir.
 */

import React from 'react';
import { Modal } from '#components/ui/Modal';
import { Button } from '#components/ui/Button';
import { useTheme } from '#hooks/useTheme';
import { PALETTE_OPTIONS } from '#types/theme.types';

export interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({ isOpen, onClose }) => {
  const { mode, palette, setMode, setPalette } = useTheme();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Görünüm ve Tema Ayarları"
      description="Kurumsal arayüz renklerini ve sistem temanızı özelleştirin"
      maxWidth="lg"
      icon={
        <svg className="w-4 h-4 text-brand-600 dark:text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
        </svg>
      }
      footer={
        <Button variant="primary" size="md" onClick={onClose}>
          Tamam
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 1. BÖLÜM: TEMA TERCİHİ */}
        <div>
          <span className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5">
            Tema Modu
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Sistem */}
            <button
              type="button"
              onClick={() => setMode('system')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                mode === 'system'
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-900/20 ring-1 ring-brand-500'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {mode === 'system' && <span className="w-2 h-2 rounded-full bg-brand-600"></span>}
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Sistem</div>
              <div className="text-[10px] text-slate-400">İşletim sistemine uy</div>
            </button>

            {/* Aydınlık */}
            <button
              type="button"
              onClick={() => setMode('light')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                mode === 'light'
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-900/20 ring-1 ring-brand-500'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {mode === 'light' && <span className="w-2 h-2 rounded-full bg-brand-600"></span>}
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Aydınlık</div>
              <div className="text-[10px] text-slate-400">Temiz açık zemin</div>
            </button>

            {/* Karanlık */}
            <button
              type="button"
              onClick={() => setMode('dark')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                mode === 'dark'
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-900/20 ring-1 ring-brand-500'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                {mode === 'dark' && <span className="w-2 h-2 rounded-full bg-brand-600"></span>}
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Karanlık</div>
              <div className="text-[10px] text-slate-400">Göz yormayan koyu</div>
            </button>
          </div>
        </div>

        {/* 2. BÖLÜM: RENK PALETİ TERCİHİ */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Kurumsal Renk Paleti
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Seçim anında uygulanır</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PALETTE_OPTIONS.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setPalette(item.id)}
                className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all flex items-start gap-3 bg-white dark:bg-slate-800/80 ${
                  palette === item.id
                    ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex -space-x-1.5 pt-0.5">
                  <span className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: item.primaryColor }}></span>
                  <span className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: item.secondaryColor }}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</div>
                    {palette === item.id && <span className="text-xs text-brand-600 font-bold ml-1">✓</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{item.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
