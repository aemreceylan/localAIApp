/**
 * @file useAutoResizeTextarea.ts
 * @description İçeriğe göre yüksekliği otomatik ayarlayan (min 44px, max 200px) saf React kancası.
 * @design-token user_ui_conventions.md madde 2.1
 */

import { useEffect, useRef, useCallback } from 'react';

export interface UseAutoResizeTextareaOptions {
  minHeight?: number;
  maxHeight?: number;
  value: string;
}

export function useAutoResizeTextarea({
  minHeight = 44,
  maxHeight = 200,
  value,
}: UseAutoResizeTextareaOptions) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    // Yüksekliği sıfırlayıp scrollHeight ile yeniden hesapla
    el.style.height = `${minHeight}px`;
    const newHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [minHeight, maxHeight]);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return { textareaRef, resize };
}
