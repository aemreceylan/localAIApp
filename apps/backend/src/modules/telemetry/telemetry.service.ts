/**
 * @file telemetry.service.ts
 * @description Kurumsal Sistem Telemetrisi, HTTP Trafik Analitiği ve LLM Kaynak Tüketim Servisi.
 */

import os from 'node:os';
import process from 'node:process';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { env } from '#config/env.config.js';
import { AiUsageLogModel } from '#modules/telemetry/ai-usage.model.js';
import type {
  HttpMinuteBucket,
  HttpMetricsSummary,
  CreateAiUsageLogDto,
  LlmMetricsSummary,
  SystemMetrics,
  TelemetryOverview,
} from '#modules/telemetry/telemetry.types.js';

export class TelemetryService {
  // En fazla 1440 dakika (24 saat) tutan dairesel bellek deposu
  private readonly minuteBuckets = new Map<number, HttpMinuteBucket>();
  private readonly maxBuckets = 1440;
  private readonly eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });

  // CPU hesaplaması için önceki örneklem değerleri
  private lastCpuUsage = process.cpuUsage();
  private lastCpuCheckTime = Date.now();
  private cachedCpuPercent = 0;

  constructor() {
    this.eventLoopHistogram.enable();
  }

  /**
   * Her gelen HTTP isteğinin sonuçlarını ilgili dakika sepetine kaydeder.
   */
  recordHttpRequest(statusCode: number, durationMs: number): void {
    const now = Date.now();
    const minuteTimestamp = Math.floor(now / 60000) * 60000;
    const bucket = this.getOrCreateBucket(now, minuteTimestamp);

    bucket.totalRequests += 1;
    bucket.totalDurationMs += durationMs;

    this.recordStatusCount(bucket, statusCode);

    if (bucket.latencies.length < 500) {
      bucket.latencies.push(durationMs);
    }
  }

  private getOrCreateBucket(now: number, minuteTimestamp: number): HttpMinuteBucket {
    let bucket = this.minuteBuckets.get(minuteTimestamp);
    if (!bucket) {
      bucket = {
        timestamp: minuteTimestamp,
        totalRequests: 0,
        status2xx: 0,
        status3xx: 0,
        status4xx: 0,
        status5xx: 0,
        totalDurationMs: 0,
        latencies: [],
      };
      this.minuteBuckets.set(minuteTimestamp, bucket);
      this.evictOldBuckets(now);
    }
    return bucket;
  }

  private evictOldBuckets(now: number): void {
    if (this.minuteBuckets.size <= this.maxBuckets) return;
    const cutoff = now - 24 * 60 * 60 * 1000;
    for (const [key] of this.minuteBuckets) {
      if (key < cutoff) {
        this.minuteBuckets.delete(key);
      }
    }
  }

  private recordStatusCount(bucket: HttpMinuteBucket, statusCode: number): void {
    if (statusCode >= 200 && statusCode < 300) {
      bucket.status2xx += 1;
    } else if (statusCode >= 300 && statusCode < 400) {
      bucket.status3xx += 1;
    } else if (statusCode >= 400 && statusCode < 500) {
      bucket.status4xx += 1;
    } else if (statusCode >= 500) {
      bucket.status5xx += 1;
    }
  }

  /**
   * İstenen zaman penceresindeki (örn: son 60 dakika) HTTP metrik özetini döner.
   */
  getHttpMetrics(timeWindowMinutes = 60): HttpMetricsSummary {
    const now = Date.now();
    const cutoff = now - timeWindowMinutes * 60 * 1000;

    const relevantBuckets: HttpMinuteBucket[] = [];
    for (const [timestamp, bucket] of this.minuteBuckets.entries()) {
      if (timestamp >= cutoff) {
        relevantBuckets.push(bucket);
      }
    }

    relevantBuckets.sort((a, b) => a.timestamp - b.timestamp);

    let totalRequests = 0;
    let total2xx = 0;
    let total3xx = 0;
    let total4xx = 0;
    let total5xx = 0;
    let totalDurationMs = 0;
    const allLatencies: number[] = [];

    const timeline = relevantBuckets.map((b) => {
      totalRequests += b.totalRequests;
      total2xx += b.status2xx;
      total3xx += b.status3xx;
      total4xx += b.status4xx;
      total5xx += b.status5xx;
      totalDurationMs += b.totalDurationMs;
      allLatencies.push(...b.latencies);

      const d = new Date(b.timestamp);
      const minuteStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      const bucketErrors = b.status4xx + b.status5xx;
      const bucketAvg = b.totalRequests > 0 ? Math.round(b.totalDurationMs / b.totalRequests) : 0;
      const sortedBucketLatencies = [...b.latencies].sort((x, y) => x - y);
      const bucketP95 = this.calculatePercentile(sortedBucketLatencies, 95);

      return {
        minute: minuteStr,
        timestamp: b.timestamp,
        requests: b.totalRequests,
        errors: bucketErrors,
        avgLatencyMs: bucketAvg,
        p95LatencyMs: bucketP95,
      };
    });

    const totalErrors = total4xx + total5xx;
    const errorRate = totalRequests > 0 ? Number(((totalErrors / totalRequests) * 100).toFixed(2)) : 0;
    const successRate = totalRequests > 0 ? Number(((total2xx / totalRequests) * 100).toFixed(2)) : 100;
    const avgLatencyMs = totalRequests > 0 ? Math.round(totalDurationMs / totalRequests) : 0;

    allLatencies.sort((a, b) => a - b);
    const p50LatencyMs = this.calculatePercentile(allLatencies, 50);
    const p95LatencyMs = this.calculatePercentile(allLatencies, 95);
    const p99LatencyMs = this.calculatePercentile(allLatencies, 99);

    return {
      timeWindowMinutes,
      totalRequests,
      successRate,
      errorRate,
      avgLatencyMs,
      p50LatencyMs,
      p95LatencyMs,
      p99LatencyMs,
      statusCodes: {
        '2xx': total2xx,
        '3xx': total3xx,
        '4xx': total4xx,
        '5xx': total5xx,
      },
      timeline,
    };
  }

  /**
   * LLM model çağrısı metrik kaydını MongoDB'ye kaydeder.
   */
  async recordLlmUsage(dto: CreateAiUsageLogDto): Promise<void> {
    try {
      await AiUsageLogModel.create({
        user_id: dto.userId,
        conversation_id: dto.conversationId,
        model: dto.model,
        provider: dto.provider,
        prompt_tokens: dto.promptTokens,
        completion_tokens: dto.completionTokens,
        total_tokens: dto.totalTokens,
        duration_ms: dto.durationMs,
        ttft_ms: dto.ttftMs,
        status: dto.status,
        error_message: dto.errorMessage,
      } as any);
    } catch (err) {
      console.warn('[Telemetry] LLM kullanım logu kaydedilirken hata:', err);
    }
  }

  /**
   * Belirtilen zaman aralığındaki LLM tüketim istatistiklerini MongoDB üzerinden derler.
   */
  async getLlmMetrics(timeWindowHours = 24): Promise<LlmMetricsSummary> {
    const cutoff = new Date(Date.now() - timeWindowHours * 3600 * 1000);

    const matchStage = { $match: { created_at: { $gte: cutoff } } };

    const [generalStats, modelStats] = await Promise.all([
      AiUsageLogModel.aggregate([
        matchStage,
        {
          $group: {
            _id: null,
            totalInvocations: { $sum: 1 },
            successfulInvocations: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
            },
            failedInvocations: {
              $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] },
            },
            totalTokens: { $sum: '$total_tokens' },
            totalPromptTokens: { $sum: '$prompt_tokens' },
            totalCompletionTokens: { $sum: '$completion_tokens' },
            avgDurationMs: { $avg: '$duration_ms' },
            avgTtftMs: { $avg: '$ttft_ms' },
          },
        },
      ]),
      AiUsageLogModel.aggregate([
        matchStage,
        {
          $group: {
            _id: { model: '$model', provider: '$provider' },
            invocations: { $sum: 1 },
            totalTokens: { $sum: '$total_tokens' },
            avgDurationMs: { $avg: '$duration_ms' },
          },
        },
        { $sort: { invocations: -1 } },
      ]),
    ]);

    const stats = generalStats[0] || {
      totalInvocations: 0,
      successfulInvocations: 0,
      failedInvocations: 0,
      totalTokens: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      avgDurationMs: 0,
      avgTtftMs: 0,
    };

    const modelBreakdown = modelStats.map((m: any) => ({
      model: m._id.model,
      provider: m._id.provider,
      invocations: m.invocations,
      totalTokens: m.totalTokens,
      avgDurationMs: Math.round(m.avgDurationMs || 0),
    }));

    return {
      timeWindowHours,
      totalInvocations: stats.totalInvocations,
      successfulInvocations: stats.successfulInvocations,
      failedInvocations: stats.failedInvocations,
      totalTokens: stats.totalTokens,
      totalPromptTokens: stats.totalPromptTokens,
      totalCompletionTokens: stats.totalCompletionTokens,
      avgDurationMs: Math.round(stats.avgDurationMs || 0),
      avgTtftMs: Math.round(stats.avgTtftMs || 0),
      modelBreakdown,
    };
  }

  /**
   * Sunucu donanımı, CPU, Bellek ve Node.js runtime metriklerini anlık toplar.
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Number(((usedMem / totalMem) * 100).toFixed(1));

    // CPU Yüzdesi hesaplama (Delta tabanlı)
    const now = Date.now();
    const timeDelta = (now - this.lastCpuCheckTime) * 1000; // mikrosaniye
    if (timeDelta > 500000) { // En az 500ms geçtiyse güncelle
      const currentCpu = process.cpuUsage();
      const userDiff = currentCpu.user - this.lastCpuUsage.user;
      const sysDiff = currentCpu.system - this.lastCpuUsage.system;
      const totalCpuTime = userDiff + sysDiff;
      const cpuCount = os.cpus().length || 1;
      this.cachedCpuPercent = Number(((totalCpuTime / (timeDelta * cpuCount)) * 100).toFixed(1));
      this.lastCpuUsage = currentCpu;
      this.lastCpuCheckTime = now;
    }

    // Event Loop Gecikmesi (ms cinsinden ortalama)
    const eventLoopLagMs = Number((this.eventLoopHistogram.mean / 1e6).toFixed(2));

    // Ollama /api/ps (Aktif yüklenmiş modeller ve VRAM tüketimi)
    let ollamaInfo: SystemMetrics['ollama'] = undefined;
    try {
      const rawUrl = env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const cleanUrl = rawUrl.replace(/\/api\/?$/, '');

      let res: Response | null = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        res = await fetch(`${cleanUrl}/api/ps`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (networkErr) {
        // Localhost -> 127.0.0.1 IPv6/IPv4 fallback (Windows uyumluluğu)
        if (cleanUrl.includes('localhost')) {
          const fallbackUrl = cleanUrl.replace('localhost', '127.0.0.1');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          res = await fetch(`${fallbackUrl}/api/ps`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } else {
          throw networkErr;
        }
      }

      if (res && res.ok) {
        const data = (await res.json()) as { models?: any[] };
        const activeModels = (data.models || []).map((m: any) => ({
          name: m.name,
          sizeVramMb: Math.round((m.size_vram || 0) / (1024 * 1024)),
          sizeMb: Math.round((m.size || 0) / (1024 * 1024)),
          expiresAt: m.expires_at || '',
        }));

        ollamaInfo = {
          isAvailable: true,
          activeModels,
        };
      } else {
        ollamaInfo = {
          isAvailable: false,
          activeModels: [],
        };
      }
    } catch {
      ollamaInfo = {
        isAvailable: false,
        activeModels: [],
      };
    }

    return {
      timestamp: new Date().toISOString(),
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        heapUsedMb: Math.round(memUsage.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memUsage.heapTotal / (1024 * 1024)),
        rssMb: Math.round(memUsage.rss / (1024 * 1024)),
        externalMb: Math.round(memUsage.external / (1024 * 1024)),
        cpuPercent: this.cachedCpuPercent,
        eventLoopLagMs,
      },
      system: {
        platform: os.platform(),
        architecture: os.arch(),
        totalMemoryMb: Math.round(totalMem / (1024 * 1024)),
        freeMemoryMb: Math.round(freeMem / (1024 * 1024)),
        usedMemoryMb: Math.round(usedMem / (1024 * 1024)),
        memoryUsagePercent: memPercent,
        cpuCores: os.cpus().length,
        cpuLoadAvg: os.loadavg().map((l) => Number(l.toFixed(2))),
      },
      ...(ollamaInfo ? { ollama: ollamaInfo } : {}),
    };
  }

  /**
   * Tüm sistem, HTTP ve LLM metriklerini tek seferde döner (Dashboard ilk yükleme için).
   */
  async getOverview(): Promise<TelemetryOverview> {
    const [system, httpSummary, llmSummary] = await Promise.all([
      this.getSystemMetrics(),
      Promise.resolve(this.getHttpMetrics(60)),
      this.getLlmMetrics(24),
    ]);

    return {
      system,
      httpSummary,
      llmSummary,
    };
  }

  /**
   * Sıralı sayı dizisinde verilen yüzdelik (percentile) değerini hesaplar.
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    const clampedIndex = Math.max(0, Math.min(index, sortedArray.length - 1));
    return Math.round(sortedArray[clampedIndex]!);
  }
}

export const telemetryService = new TelemetryService();
