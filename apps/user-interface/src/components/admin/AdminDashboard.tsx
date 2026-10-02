/**
 * @file AdminDashboard.tsx
 * @description Yönetici kontrol paneli önizlemesi (PRD 4.2 Donanım telemetrisi, GPU/Token grafikleri ve model yöneticisi).
 * @design-token stitch_design_preview.html satır 569-832
 */

import React from 'react';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
      {/* Üst Durum Kartı (Uptime & GPU) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Sistem Genel Bakış & Donanım Telemetrisi
          </h2>
          <p className="text-xs text-slate-500">
            Yerel Ollama/vLLM orkestrasyonu ve kurumsal RAG veri indeksleme boru hattı
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Uptime: %99.98</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
            NVIDIA A100 GPU: %42 Yük
          </span>
        </div>
      </div>

      {/* 4 Temel Metrik Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Toplam Token Kullanımı</div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">248.4M</div>
          <div className="text-[11px] text-emerald-600 mt-1">↑ %14.2 bu hafta</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Aktif Yerel Modeller</div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">12 / 16</div>
          <div className="text-[11px] text-slate-400 mt-1">Ollama & vLLM Cluster</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Bekleyen RAG İndekslemeleri</div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-2">3 Doküman</div>
          <div className="text-[11px] text-amber-500 mt-1">BullMQ kuyrukta işleniyor</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Aktif Yetkili Kullanıcılar</div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">1,420</div>
          <div className="text-[11px] text-emerald-600 mt-1">● 84 şu anda çevrim içi</div>
        </div>
      </div>

      {/* GPU & Token Grafiği ve Gecikme Widget'ı */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                GPU & Token Tüketim Dağılımı
              </h3>
              <p className="text-xs text-slate-400">Son 24 saatlik kaynak kullanımı</p>
            </div>
            <div className="flex gap-1 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-medium">
                24S
              </span>
              <span className="px-2 py-0.5 rounded text-slate-400">7G</span>
              <span className="px-2 py-0.5 rounded text-slate-400">30G</span>
            </div>
          </div>
          <div className="h-44 flex items-end gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex-1 bg-brand-200 dark:bg-brand-900/40 hover:bg-brand-500 rounded-t h-[35%] transition-all"></div>
            <div className="flex-1 bg-brand-200 dark:bg-brand-900/40 hover:bg-brand-500 rounded-t h-[55%] transition-all"></div>
            <div className="flex-1 bg-brand-200 dark:bg-brand-900/40 hover:bg-brand-500 rounded-t h-[40%] transition-all"></div>
            <div className="flex-1 bg-brand-200 dark:bg-brand-900/40 hover:bg-brand-500 rounded-t h-[75%] transition-all"></div>
            <div className="flex-1 bg-brand-200 dark:bg-brand-900/40 hover:bg-brand-500 rounded-t h-[90%] transition-all"></div>
            <div className="flex-1 bg-brand-200 dark:bg-brand-900/40 hover:bg-brand-500 rounded-t h-[65%] transition-all"></div>
            <div className="flex-1 bg-brand-500 rounded-t h-[85%] transition-all"></div>
            <div className="flex-1 bg-brand-500 rounded-t h-[95%] transition-all"></div>
            <div className="flex-1 bg-brand-500 rounded-t h-[70%] transition-all"></div>
            <div className="flex-1 bg-brand-600 rounded-t h-[88%] transition-all"></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 pt-2 font-mono">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>Şimdi (Canlı)</span>
          </div>
        </div>

        {/* Model Gecikme Widget'ı */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Model Yanıt Süresi
              </h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                Canlı
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Ortalama İlk Token Gecikmesi (TTFT)</p>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Llama-3.3-70B</span>
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400">142 ms</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-500 h-full rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Mistral-Nemo-12B</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">89 ms</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Qwen-2.5-Coder-32B</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">115 ms</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Cluster Donanımı:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">SX-M4 NVLink</span>
          </div>
        </div>
      </div>
    </div>
  );
};
