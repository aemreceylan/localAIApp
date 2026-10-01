/**
 * @file useResizable.ts
 * @description Kenar çubukları ve yan paneller için fare ile sürüklenebilir genişlik ayarlama kancası.
 * Fare hareketlerini dinler, seçimleri engeller ve istenen min/max sınırları içinde pürüzsüz boyutlandırma sağlar.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseResizableOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey?: string;
  direction?: 'left-to-right' | 'right-to-left'; // sol sidebar için LTR, sağ panel için RTL
  onWidthChange?: (width: number) => void;
  collapseThreshold?: number;
  onCollapse?: (collapsed: boolean) => void;
}

export interface UseResizableReturn {
  width: number;
  isDragging: boolean;
  setWidth: (width: number) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export function useResizable({
  initialWidth,
  minWidth,
  maxWidth,
  storageKey,
  direction = 'left-to-right',
  onWidthChange,
  collapseThreshold,
  onCollapse,
}: UseResizableOptions): UseResizableReturn {
  const [width, setWidthState] = useState<number>(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    }
    return initialWidth;
  });

  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const currentWidthRef = useRef(width);
  const rafIdRef = useRef<number | null>(null);

  // currentWidthRef'i senkron tut
  useEffect(() => {
    currentWidthRef.current = width;
  }, [width]);

  const setWidth = useCallback(
    (newWidth: number) => {
      const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth));
      currentWidthRef.current = clamped;
      setWidthState(clamped);
      if (storageKey) {
        localStorage.setItem(storageKey, clamped.toString());
      }
      onWidthChange?.(clamped);
    },
    [minWidth, maxWidth, storageKey, onWidthChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = currentWidthRef.current;

      document.body.classList.add('select-none');
      document.body.style.cursor = 'col-resize';
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = direction === 'left-to-right' ? e.clientX - startXRef.current : startXRef.current - e.clientX;
      const rawWidth = startWidthRef.current + deltaX;

      if (collapseThreshold && onCollapse) {
        if (rawWidth < collapseThreshold) {
          onCollapse(true);
          return;
        } else {
          onCollapse(false);
        }
      }

      const clamped = Math.max(minWidth, Math.min(maxWidth, rawWidth));

      // requestAnimationFrame ile 60/120 FPS ekran yenileme senkronizasyonu
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        currentWidthRef.current = clamped;
        setWidthState(clamped);
        onWidthChange?.(clamped);
      });
    };

    const handleMouseUp = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      setIsDragging(false);
      document.body.classList.remove('select-none');
      document.body.style.cursor = '';

      if (storageKey) {
        localStorage.setItem(storageKey, currentWidthRef.current.toString());
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, minWidth, maxWidth, collapseThreshold, onCollapse, onWidthChange, storageKey]);

  return {
    width,
    isDragging,
    setWidth,
    handleMouseDown,
  };
}
