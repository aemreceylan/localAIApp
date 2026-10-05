/**
 * @file IdleTimeoutModal.tsx
 * @description Boşta Kalma (Idle Session) 2 Dakikalık Güvenlik Geri Sayım Uyarısı Modalı.
 */

import { ShieldAlert, Clock, LogOut } from 'lucide-react';
import { Modal } from '#components/ui/Modal.js';
import { Button } from '#components/ui/Button.js';

export interface IdleTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function IdleTimeoutModal({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogout,
}: IdleTimeoutModalProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onStayLoggedIn}
      title="Güvenlik Uyarısı: Oturum Süresi Doluyor"
      size="sm"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onLogout} leftIcon={<LogOut className="w-4 h-4" />}>
            Şimdi Çıkış Yap
          </Button>
          <Button variant="primary" size="sm" onClick={onStayLoggedIn}>
            Oturumu Açık Tut
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-4 space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Uzun süredir işlem yapmadığınız tespit edildi.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kurumsal veri güvenliği gereğince oturumunuz otomatik olarak sonlandırılacaktır.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 font-mono text-xl font-bold">
          <Clock className="w-5 h-5 animate-pulse" />
          <span>{timeFormatted}</span>
        </div>
      </div>
    </Modal>
  );
}
