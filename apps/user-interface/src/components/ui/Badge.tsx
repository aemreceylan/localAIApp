/**
 * @file Badge.tsx
 * @description Durum, etiket ve metrik rozetleri (Nexus Precision Badge).
 */

import React from 'react';

export type BadgeVariant = 'brand' | 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  isMono?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  brand:
    'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800',
  emerald:
    'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  blue:
    'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  amber:
    'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  rose:
    'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
  slate:
    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  isMono = false,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${
        isMono ? 'font-mono' : 'font-sans'
      } ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
