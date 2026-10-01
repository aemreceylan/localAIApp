/**
 * @file ThemeSwitch.tsx
 * @description Aydınlık ve Karanlık mod arasında geçiş sağlayan, metinsiz,
 * sadece güneş ve ay logoları içeren kayar mekanizmalı (switch / toggle) saf React bileşeni.
 */

import React from 'react';
import { useTheme } from '#hooks/useTheme';

export interface ThemeSwitchProps {
  className?: string;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ className = '' }) => {
  const { isDark, toggleQuickTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleQuickTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
      title={isDark ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
      className={`relative inline-flex h-[32px] w-[60px] items-center rounded-full bg-slate-200 dark:bg-slate-800 p-[2px] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 border border-slate-300 dark:border-slate-700 cursor-pointer shadow-inner shrink-0 select-none ${className}`}
    >
      {/* Kayan Düğme (Sliding Thumb) - Tam 28x28px */}
      <span
        className={`absolute top-[2px] left-[2px] w-[28px] h-[28px] rounded-full bg-white dark:bg-slate-900 shadow-md transition-transform duration-200 ease-in-out border border-slate-200/80 dark:border-slate-700/80 ${
          isDark ? 'translate-x-[28px]' : 'translate-x-0'
        }`}
      />

      {/* Sol Slot: Güneş İkonu - Tam 28x28px */}
      <span
        className={`w-[28px] h-[28px] flex items-center justify-center z-10 transition-colors duration-200 shrink-0 ${
          !isDark ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </span>

      {/* Sağ Slot: Ay İkonu - Tam 28x28px */}
      <span
        className={`w-[28px] h-[28px] flex items-center justify-center z-10 transition-colors duration-200 shrink-0 ${
          isDark ? 'text-brand-300 dark:text-brand-300' : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </span>
    </button>
  );
};
