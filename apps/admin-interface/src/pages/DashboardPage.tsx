/**
 * @file DashboardPage.tsx
 * @description Admin Paneli Telemetri, Performans ve Sistem Sağlığı Gösterge Paneli.
 */

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Cpu,
  Clock,
  Database,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import { metricsService } from '#services/metricsService.js';
import { Card } from '#components/ui/Card.js';
import { Badge } from '#components/ui/Badge.js';
import { Progress } from '#components/ui/Progress.js';
import { Table, type Column } from '#components/ui/Table.js';
import type { TelemetryOverview } from '#types/metrics.js';

export function DashboardPage() {
  const { data, isLoading, refetch, isRefetching } = useQuery<TelemetryOverview>({
    queryKey: ['metrics', 'overview'],
    queryFn: () => metricsService.getOverview(),
    refetchInterval: 10000, // 10 saniyede bir canlı otomatik yenileme
  });

  const http = data?.httpSummary;
  const sys = data?.system;
  const llm = data?.llmSummary;

  const modelColumns: Column<any>[] = [
    {
      key: 'model',
      header: 'Model Adı',
      render: (row) => (
        <div className="font-mono font-medium text-xs text-slate-800 dark:text-slate-200">
          {row.model}
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Sağlayıcı',
      render: (row) => (
        <Badge size="sm" variant="info">
          {row.provider}
        </Badge>
      ),
    },
    {
      key: 'invocations',
      header: 'Çağrı Sayısı',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-semibold">{row.invocations.toLocaleString()}</span>
      ),
    },
    {
      key: 'totalTokens',
      header: 'Toplam Token',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs">{row.totalTokens.toLocaleString()}</span>
      ),
    },
    {
      key: 'avgDurationMs',
      header: 'Ort. Yanıt Süresi',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">
          {row.avgDurationMs >= 1000
            ? `${(row.avgDurationMs / 1000).toFixed(1)}s`
            : `${row.avgDurationMs}ms`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Canlı Yenileme */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Sistem Performansı & Telemetri
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            HTTP trafik yükü, donanım kaynakları ve LLM token analitiği (10s canlı akış).
          </p>
        </div>

        <button
          onClick={() => void refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* 4 Ana Metrik Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. HTTP İstekleri */}
        <Card padding="sm" className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                HTTP İstekleri (Son 60 dk)
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {http?.totalRequests.toLocaleString() ?? '—'}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Başarı: %{http?.successRate ?? 100}</span>
            <span className={http?.errorRate && http.errorRate > 0 ? 'text-rose-500 font-medium' : ''}>
              Hata: %{http?.errorRate ?? 0}
            </span>
          </div>
        </Card>

        {/* 2. Gecikme (Latency) */}
        <Card padding="sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Ortalama Gecikme
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {http?.avgLatencyMs ? `${http.avgLatencyMs}ms` : '—'}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-500">
            <span>p50: {http?.p50LatencyMs ?? 0}ms</span>
            <span>p95: {http?.p95LatencyMs ?? 0}ms</span>
            <span>p99: {http?.p99LatencyMs ?? 0}ms</span>
          </div>
        </Card>

        {/* 3. Sunucu Bellek ve CPU */}
        <Card padding="sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Sunucu Bellek / CPU
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                %{sys?.system.memoryUsagePercent ?? 0}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <Progress
              value={sys?.system.memoryUsagePercent ?? 0}
              showPercent={false}
              size="sm"
              variant={
                (sys?.system.memoryUsagePercent ?? 0) > 85
                  ? 'danger'
                  : (sys?.system.memoryUsagePercent ?? 0) > 70
                  ? 'warning'
                  : 'primary'
              }
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>{sys?.system.usedMemoryMb ?? 0} MB / {sys?.system.totalMemoryMb ?? 0} MB</span>
              <span>CPU: %{sys?.process.cpuPercent ?? 0}</span>
            </div>
          </div>
        </Card>

        {/* 4. LLM Token Tüketimi */}
        <Card padding="sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                LLM Token Tüketimi (24s)
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {llm?.totalTokens.toLocaleString() ?? 0}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>İstek: {llm?.totalInvocations ?? 0}</span>
            <span>Ort. Süre: {llm?.avgDurationMs ? `${(llm.avgDurationMs / 1000).toFixed(1)}s` : '0s'}</span>
          </div>
        </Card>
      </div>

      {/* Orta Bölüm: Donanım/Node.js Detayları & Ollama VRAM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Node.js Proses Metrikleri */}
        <Card title="Node.js Çalışma Zamanı Sağlığı" padding="md">
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Çalışma Süresi (Uptime)</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {sys?.process.uptimeSeconds
                  ? `${Math.floor(sys.process.uptimeSeconds / 3600)}s ${Math.floor(
                      (sys.process.uptimeSeconds % 3600) / 60
                    )}d`
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Heap Kullanımı (V8)</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {sys?.process.heapUsedMb ?? 0} MB / {sys?.process.heapTotalMb ?? 0} MB
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">RSS (Resident Set Size)</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {sys?.process.rssMb ?? 0} MB
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Event Loop Gecikmesi (Lag)</span>
              <Badge
                size="sm"
                variant={(sys?.process.eventLoopLagMs ?? 0) > 50 ? 'warning' : 'success'}
              >
                {sys?.process.eventLoopLagMs ?? 0} ms
              </Badge>
            </div>
          </div>
        </Card>

        {/* Yerel Ollama Motoru & VRAM Durumu */}
        <Card title="Yerel Model Motoru (Ollama / vLLM)" padding="md" className="lg:col-span-2">
          {sys?.ollama?.isAvailable ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Ollama Servis Durumu</span>
                <Badge size="sm" variant="success" dot>
                  Çalışıyor (Aktif)
                </Badge>
              </div>

              {sys.ollama.activeModels.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Şu anda RAM/VRAM'e yüklenmiş aktif model bulunmuyor. İstek geldiğinde otomatik belleğe alınacaktır.
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Bellekteki Modeller (VRAM Tüketimi)
                  </span>
                  {sys.ollama.activeModels.map((m) => (
                    <div
                      key={m.name}
                      className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between text-xs"
                    >
                      <div className="font-mono font-medium">{m.name}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">Boyut: {m.sizeMb} MB</span>
                        <Badge size="sm" variant="info">
                          VRAM: {m.sizeVramMb} MB
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <HardDrive className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Yerel Ollama sunucusuna şu anda erişilemiyor.
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Sunucunuzda Ollama servisinin çalıştığından ve PORT 11434 bağlantısının açık olduğundan emin olunuz.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Alt Bölüm: Model Bazlı LLM Tüketim Tablosu */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Model Bazlı Tüketim & Yanıt Süreleri (Son 24 Saat)
        </h2>
        <Table
          columns={modelColumns}
          data={llm?.modelBreakdown || []}
          keyExtractor={(row) => `${row.provider}/${row.model}`}
          isLoading={isLoading}
          emptyMessage="Son 24 saat içinde kaydedilmiş AI kullanım verisi bulunmuyor."
        />
      </div>
    </div>
  );
}
