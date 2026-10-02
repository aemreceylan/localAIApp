/**
 * @file Modal.tsx
 * @description Saf React 18+ ve Tailwind CSS ile yazılmış, erişilebilir ve pürüzsüz diyalog/modal bileşeni.
 * ESC tuşu dinleme, dışına tıklayınca kapanma ve animasyonlu açılış desteği içerir.
 */

import React, { useEffect, useRef } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      open
      aria-modal="true"
      className="fixed inset-0 z-50 m-0 p-4 max-w-none max-h-none w-full h-full bg-slate-900/60 backdrop-blur-sm flex items-center justify-center border-0 transition-all duration-200"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Pencereyi kapat"
        onClick={onClose}
        className="fixed inset-0 w-full h-full bg-transparent border-0 cursor-default"
      />
      <div
        ref={contentRef}
        className={`relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full shadow-2xl overflow-hidden transition-all duration-200 ${maxWidthMap[maxWidth]}`}
      >
        {/* Modal Başlık Alanı */}
        {(title || icon) && (
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {icon && (
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/50 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Kapat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Modal İçerik Alanı */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">{children}</div>

        {/* Modal Alt Bar / Aksiyonlar */}
        {footer && (
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
};
