/**
 * @file dev-traffic.types.ts
 * @description Canlı HTTP Trafik ve Stream İzleyici (DevInspector) için tip tanımları.
 */

export interface DevTrafficRequest {
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, unknown> | undefined;
  params?: Record<string, unknown> | undefined;
}

export interface DevTrafficResponse {
  status: number;
  body?: unknown;
  streamSummary?: string | undefined;
  isStream?: boolean | undefined;
}

export interface DevTrafficEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  clientIp?: string | undefined;
  request: DevTrafficRequest;
  response: DevTrafficResponse;
  formattedText?: string | undefined;
}

export interface DevInspectorStats {
  totalRequests: number;
  errorCount: number;
  avgDurationMs: number;
  activeSseClients: number;
}
