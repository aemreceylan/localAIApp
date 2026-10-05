/**
 * @file Card.tsx
 * @description Saf React 19 + Tailwind CSS v4 Kart ve Panel Bileşeni.
 */

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function Card({
  children,
  title,
  subtitle,
  action,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-xs transition-shadow ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}

      <div className={paddingStyles[padding]}>{children}</div>
    </div>
  );
}
