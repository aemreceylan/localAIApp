/**
 * @file telemetry.types.ts
 * @description Telemetri, performans metrikleri ve kaynak izleme veri tipleri.
 */

export interface HttpMinuteBucket {
  timestamp: number; // Dakika başlangıç zamanı (ms)
  totalRequests: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  totalDurationMs: number;
  latencies: number[]; // Gecikme süreleri (ms)
}

export interface HttpMetricsSummary {
  timeWindowMinutes: number;
  totalRequests: number;
  successRate: number; // Yüzde (0-100)
  errorRate: number;   // Yüzde (0-100)
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  statusCodes: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
  timeline: Array<{
    minute: string; // ISO format veya HH:mm
    timestamp: number;
    requests: number;
    errors: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
  }>;
}

export interface CreateAiUsageLogDto {
  userId?: string | undefined;
  conversationId?: string | undefined;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  ttftMs?: number | undefined;
  status: 'success' | 'error';
  errorMessage?: string | undefined;
}

export interface LlmMetricsSummary {
  timeWindowHours: number;
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  avgDurationMs: number;
  avgTtftMs: number;
  modelBreakdown: Array<{
    model: string;
    provider: string;
    invocations: number;
    totalTokens: number;
    avgDurationMs: number;
  }>;
}

export interface SystemMetrics {
  timestamp: string;
  process: {
    uptimeSeconds: number;
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    externalMb: number;
    cpuPercent: number;
    eventLoopLagMs: number;
  };
  system: {
    platform: string;
    architecture: string;
    totalMemoryMb: number;
    freeMemoryMb: number;
    usedMemoryMb: number;
    memoryUsagePercent: number;
    cpuCores: number;
    cpuLoadAvg: number[];
  };
  ollama?: {
    isAvailable: boolean;
    activeModels: Array<{
      name: string;
      sizeVramMb: number;
      sizeMb: number;
      expiresAt: string;
    }>;
  };
}

export interface TelemetryOverview {
  system: SystemMetrics;
  httpSummary: HttpMetricsSummary;
  llmSummary: LlmMetricsSummary;
}
