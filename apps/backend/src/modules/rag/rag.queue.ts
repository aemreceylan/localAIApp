/**
 * @file rag.queue.ts
 * @description RAG Asenkron Doküman İndeksleme Kuyruğu (BullMQ Redis Queue).
 * Kullanıcı tarafından yüklenen PDF ve metin dokümanlarını sıraya alır;
 * arka plan işçilerinin (workers) kontrollü, asenkron ve hataya dayanıklı (resilient)
 * şekilde metin çıkarma, parçalama (chunking) ve vektörleştirme yürütmesini sağlar.
 *
 * Mimari Rol & Tasarım İlkeleri:
 * - Asenkron İş Kuyruğu (Producer Pattern): API isteklerini bloke etmeden HTTP 202 Accepted döner.
 * - Retry & Exponential Backoff: Geçici sistem veya model kesintilerinde işleri 3 kez üstel gecikmeyle tekrarlar.
 * - Resilience: Redis bağlantı kopmalarında durumu tespit eder ve sağlık durumunu (`isHealthy`) raporlar.
 *
 * @example
 * ```typescript
 * import { ragQueue } from '#modules/rag/rag.queue.js';
 *
 * await ragQueue.addIngestionJob({
 *   documentId: 'doc_123',
 *   filePath: '/uploads/belge.pdf',
 *   filename: 'belge.pdf',
 *   mimeType: 'application/pdf',
 *   allowedRoles: ['hr', 'manager'],
 * });
 * ```
 */

import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { env } from '#config/env.config.js';

export const RAG_INGESTION_QUEUE_NAME = 'rag-document-ingestion';

/**
 * Doküman işleme işinin (job) yük taşıma (payload) verisi
 */
export interface DocumentIngestionJobData {
  documentId: string;
  filePath: string;
  filename: string;
  mimeType: string;
  allowedRoles: string[];
  metadata?: Record<string, unknown>;
}

export class RagQueue {
  private queue: Queue<DocumentIngestionJobData> | null = null;
  private readonly queueName: string;

  constructor(queueName = RAG_INGESTION_QUEUE_NAME) {
    this.queueName = queueName;
  }

  /**
   * Ortam değişkenlerinden Redis bağlantı ayarlarını üretir.
   */
  private getRedisConnection(): ConnectionOptions {
    if (env.REDIS_URL) {
      try {
        const parsed = new URL(env.REDIS_URL);
        const connection: ConnectionOptions = {
          host: parsed.hostname || '127.0.0.1',
          port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
        };
        if (parsed.password) {
          connection.password = parsed.password;
        }
        return connection;
      } catch {
        // Geçersiz URL durumunda varsayılan host/port
      }
    }

    const host = env.REDIS_HOST ?? '127.0.0.1';
    const port = env.REDIS_PORT ?? 6379;
    const connection: ConnectionOptions = { host, port };
    if (env.REDIS_PASSWORD) {
      connection.password = env.REDIS_PASSWORD;
    }
    return connection;
  }

  private jobOptions = {
    attempts: 3,
    backoffDelay: 2000,
    removeOnCompleteCount: 1000,
    removeOnFailCount: 5000,
  };

  /**
   * BullMQ kuyruk örneğini tembel yükleme (lazy initialization) ile başlatır.
   */
  getQueue(): Queue<DocumentIngestionJobData> {
    if (!this.queue) {
      this.queue = new Queue<DocumentIngestionJobData>(this.queueName, {
        connection: this.getRedisConnection(),
        defaultJobOptions: {
          attempts: this.jobOptions.attempts,
          backoff: {
            type: 'exponential',
            delay: this.jobOptions.backoffDelay,
          },
          removeOnComplete: {
            age: 86400,
            count: this.jobOptions.removeOnCompleteCount,
          },
          removeOnFail: {
            age: 604800,
            count: this.jobOptions.removeOnFailCount,
          },
        },
      });

      this.queue.on('error', (err) => {
        console.error(`[RagQueue] '${this.queueName}' kuyruk hatası:`, err.message);
      });
    }

    return this.queue;
  }

  /**
   * Admin arayüzünden gelen yeni kuyruk ayarlarını uygular (Hot-Reload).
   */
  updateJobOptions(options: {
    attempts?: number;
    backoffDelay?: number;
    removeOnCompleteCount?: number;
    removeOnFailCount?: number;
  }): void {
    if (options.attempts !== undefined) this.jobOptions.attempts = options.attempts;
    if (options.backoffDelay !== undefined) this.jobOptions.backoffDelay = options.backoffDelay;
    if (options.removeOnCompleteCount !== undefined) this.jobOptions.removeOnCompleteCount = options.removeOnCompleteCount;
    if (options.removeOnFailCount !== undefined) this.jobOptions.removeOnFailCount = options.removeOnFailCount;
  }

  /**
   * Yeni bir doküman indeksleme işini kuyruğa ekler.
   * Güncel dinamik çalışma parametrelerini (attempts, backoff, cleanup) uygular.
   *
   * @param data Doküman işleme verileri
   * @param customOptions Özel job seçenekleri (opsiyonel)
   * @returns Eklenen iş nesnesi
   */
  async addIngestionJob(
    data: DocumentIngestionJobData,
    customOptions?: JobsOptions
  ) {
    const queue = this.getQueue();
    const jobName = `ingest-${data.documentId}`;

    const effectiveOptions: JobsOptions = {
      attempts: this.jobOptions.attempts,
      backoff: {
        type: 'exponential',
        delay: this.jobOptions.backoffDelay,
      },
      removeOnComplete: {
        age: 86400,
        count: this.jobOptions.removeOnCompleteCount,
      },
      removeOnFail: {
        age: 604800,
        count: this.jobOptions.removeOnFailCount,
      },
      ...customOptions,
    };

    return await queue.add(jobName, data, effectiveOptions);
  }

  /**
   * Kuyruk ve Redis bağlantı sağlığını kontrol eder.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const queue = this.getQueue();
      await queue.getJobCounts();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Uygulama kapanışında kuyruk bağlantısını zarifçe kapatır (Graceful Shutdown).
   */
  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }
}

export const ragQueue = new RagQueue();
