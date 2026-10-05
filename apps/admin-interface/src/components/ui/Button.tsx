/**
 * @file Button.tsx
 * @description Saf React 19 + Tailwind CSS v4 Buton Bileşeni (Sıfır dış UI kütüphanesi).
 */

import React, { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] select-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm border border-transparent dark:bg-indigo-500 dark:hover:bg-indigo-600',
    secondary:
      'bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400 border border-transparent dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm border border-transparent dark:bg-rose-600 dark:hover:bg-rose-700',
    outline:
      'bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-100 focus:ring-slate-400 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-300 dark:text-slate-400 dark:hover:bg-slate-800',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
}
