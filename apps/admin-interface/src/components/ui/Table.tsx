/**
 * @file Table.tsx
 * @description Saf React 19 + Tailwind CSS v4 Veri Tablosu Bileşeni.
 * Sıfır dış kütüphane, temiz şeritler, yapışkan başlık ve boş durum desteği.
 */

import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'Görüntülenecek veri bulunamadı.',
  onRowClick,
}: TableProps<T>) {
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/50">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={`py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${
                  alignStyles[col.align || 'left']
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {isLoading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-slate-400 dark:text-slate-500"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Veriler yükleniyor...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-slate-400 dark:text-slate-500"
              >
                <span className="text-xs font-medium">{emptyMessage}</span>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3.5 px-4 text-slate-700 dark:text-slate-300 align-middle ${
                      alignStyles[col.align || 'left']
                    }`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as any)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
