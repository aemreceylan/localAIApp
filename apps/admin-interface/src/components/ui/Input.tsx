/**
 * @file Input.tsx
 * @description Saf React 19 + Tailwind CSS v4 Metin Girişi Bileşeni.
 */

import React, { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, leftIcon, rightIcon, className = '', id, ...props },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 select-none uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border transition-all duration-150 focus:outline-none focus:ring-2 ${
            leftIcon ? 'pl-9' : 'pl-3.5'
          } ${rightIcon ? 'pr-9' : 'pr-3.5'} py-2 ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
          } disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 text-slate-400 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-500 font-medium">{error}</p>
      )}

      {!error && helperText && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
});
