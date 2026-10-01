/**
 * @file ShareModal.tsx
 * @description Sohbeti şirket içindeki diğer kullanıcılarla salt okunur bağlantı ile paylaşma modalı.
 */

import React, { useState } from 'react';
import { Modal } from '#components/ui/Modal';
import { Button } from '#components/ui/Button';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatTitle?: string;
  shareUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  chatTitle = 'Q3 KVKK & Hukuk Değerlendirmesi',
  shareUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const activeShareUrl =
    shareUrl || (typeof window !== 'undefined' ? `${window.location.origin}/share/c_98f41e0a2` : 'https://nexusai.local/share/c_98f41e0a2');

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sohbeti Paylaş"
      description="Bu analizi kurum içindeki yetkili iş arkadaşlarınızla salt okunur bağlantı olarak paylaşın."
      maxWidth="md"
      icon={
        <svg className="w-4 h-4 text-brand-600 dark:text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      }
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="md" onClick={onClose}>
            Kapat
          </Button>
          <Button variant="primary" size="md" onClick={handleCopy}>
            {copied ? 'Bağlantı Kopyalandı!' : 'Bağlantıyı Kopyala'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Paylaşılan Konu
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {chatTitle}
          </p>
        </div>

        <div>
          <label htmlFor="share-url-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Salt Okunur Erişim Bağlantısı
          </label>
          <div className="flex items-center gap-2">
            <input
              id="share-url-input"
              type="text"
              readOnly
              value={activeShareUrl}
              className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-200 select-all focus:outline-none"
            />
            <Button variant="secondary" size="md" onClick={handleCopy}>
              {copied ? '✓' : 'Kopyala'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
