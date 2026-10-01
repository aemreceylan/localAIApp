/**
 * @file useTheme.ts
 * @description Nexus Precision Tasarım Sistemi tema modu (system/light/dark) ve kurumsal renk paleti yönetim kancası.
 * Sıfır dış kütüphane ile saf CSS Custom Properties ve localStorage desteği sağlar.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode, ColorPalette } from '#types/theme.types';

const STORAGE_THEME_KEY = 'nexus_theme';
const STORAGE_PALETTE_KEY = 'nexus_palette';

export interface UseThemeReturn {
  mode: ThemeMode;
  palette: ColorPalette;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: ColorPalette) => void;
  toggleQuickTheme: () => void;
}

/**
 * Tema ve Palet Yönetim Kancası
 * 
 * @returns {UseThemeReturn} Tema durumu ve değiştirici fonksiyonlar
 */
export function useTheme(): UseThemeReturn {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return 'system';
  });

  const [palette, setPaletteState] = useState<ColorPalette>(() => {
    const saved = localStorage.getItem(STORAGE_PALETTE_KEY);
    if (saved === 'emerald' || saved === 'obsidian' || saved === 'ocean') return saved;
    return 'indigo';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sistem rengi değişimini dinleme ve DOM'a yansıtma
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let activeIsDark = false;
      if (mode === 'dark') {
        activeIsDark = true;
      } else if (mode === 'light') {
        activeIsDark = false;
      } else {
        activeIsDark = mediaQuery.matches;
      }

      setIsDark(activeIsDark);
      document.documentElement.classList.toggle('dark', activeIsDark);
    };

    applyTheme();

    const listener = () => {
      if (mode === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [mode]);

  // Renk paletini DOM'a öznitelik olarak yansıtma
  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
  }, [palette]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    if (newMode === 'system') {
      localStorage.removeItem(STORAGE_THEME_KEY);
    } else {
      localStorage.setItem(STORAGE_THEME_KEY, newMode);
    }
  }, []);

  const setPalette = useCallback((newPalette: ColorPalette) => {
    setPaletteState(newPalette);
    localStorage.setItem(STORAGE_PALETTE_KEY, newPalette);
  }, []);

  const toggleQuickTheme = useCallback(() => {
    setIsDark((currentIsDark) => {
      const nextIsDark = !currentIsDark;
      const nextMode: ThemeMode = nextIsDark ? 'dark' : 'light';
      setModeState(nextMode);
      localStorage.setItem(STORAGE_THEME_KEY, nextMode);
      document.documentElement.classList.toggle('dark', nextIsDark);
      return nextIsDark;
    });
  }, []);

  return {
    mode,
    palette,
    isDark,
    setMode,
    setPalette,
    toggleQuickTheme,
  };
}
