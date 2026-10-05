/**
 * @file metrics.ts
 * @description Sistem, HTTP trafik ve LLM telemetri metrikleri tipleri.
 */

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

export interface HttpMetricsSummary {
  timeWindowMinutes: number;
  totalRequests: number;
  successRate: number;
  errorRate: number;
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
    minute: string;
    timestamp: number;
    requests: number;
    errors: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
  }>;
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

export interface TelemetryOverview {
  system: SystemMetrics;
  httpSummary: HttpMetricsSummary;
  llmSummary: LlmMetricsSummary;
}
