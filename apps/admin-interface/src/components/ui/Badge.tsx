/**
 * @file Badge.tsx
 * @description Saf React 19 + Tailwind CSS v4 Durum Etiketi (Badge) Bileşeni.
 */

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  const variantStyles = {
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
    warning:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
    danger:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
    info:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60',
    neutral:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const dotColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-indigo-500',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} shrink-0`} />
      )}
      <span>{children}</span>
    </span>
  );
}
