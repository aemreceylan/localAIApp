/**
 * @file Progress.tsx
 * @description Saf React 19 + Tailwind CSS v4 İlerleme Çubuğu (Progress Bar) Bileşeni.
 */


export interface ProgressProps {
  value: number; // 0 - 100
  max?: number;
  label?: string;
  showPercent?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  label,
  showPercent = true,
  variant = 'primary',
  size = 'md',
  animated = false,
  className = '',
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantStyles = {
    primary: 'bg-indigo-600 dark:bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {label}
            </span>
          )}
          {showPercent && (
            <span className="font-mono text-slate-500 dark:text-slate-400">
              %{percentage}
            </span>
          )}
        </div>
      )}

      <div
        className={`w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden ${sizeStyles[size]}`}
      >
        <div
          style={{ width: `${percentage}%` }}
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            variantStyles[variant]
          } ${animated ? 'animate-pulse' : ''}`}
        />
      </div>
    </div>
  );
}
