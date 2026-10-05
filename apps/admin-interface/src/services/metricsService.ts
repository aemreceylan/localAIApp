/**
 * @file metricsService.ts
 * @description Admin Paneli Telemetri, Sistem Kaynakları ve LLM Analitik Servisi.
 */

import { apiClient } from '#services/apiClient.js';
import type {
  TelemetryOverview,
  HttpMetricsSummary,
  LlmMetricsSummary,
  SystemMetrics,
} from '#types/metrics.js';

export const metricsService = {
  /**
   * Dashboard genel bakış metrikleri.
   */
  async getOverview(): Promise<TelemetryOverview> {
    return await apiClient<TelemetryOverview>('/api/admin/metrics/overview');
  },

  /**
   * HTTP istek ve yanıt süresi dakika istatistikleri.
   */
  async getHttpMetrics(minutes = 60): Promise<HttpMetricsSummary> {
    return await apiClient<HttpMetricsSummary>('/api/admin/metrics/http', {
      params: { minutes },
    });
  },

  /**
   * LLM model ve token kullanım istatistikleri.
   */
  async getLlmMetrics(hours = 24): Promise<LlmMetricsSummary> {
    return await apiClient<LlmMetricsSummary>('/api/admin/metrics/llm', {
      params: { hours },
    });
  },

  /**
   * Sunucu donanımı, CPU, Bellek ve Ollama VRAM durumu.
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    return await apiClient<SystemMetrics>('/api/admin/metrics/system');
  },
};
