/**
 * @file rag.worker.ts
 * @description RAG Asenkron Doküman İndeksleme Arka Plan İşçisi (BullMQ Redis Worker).
 * Kuyruktan gelen doküman işleme görevlerini tüketir (consumer); metin çıkarma,
 * rekürsif parçalama (chunking), Vercel AI SDK ile vektör gömme (embedding) ve
 * Qdrant vektör tabanına Document ACL etiketli kayıt adımlarını orkestre eder.
 *
 * Mimari Rol & Tasarım İlkeleri:
 * - Consumer Pattern: Kuyruktaki işleri kontrollü paralellikte (`concurrency: 2`) işler;
 *   sunucu CPU ve bellek kaynaklarının tükenmesini önler.
 * - Resilience & Graceful Error Handling: Herhangi bir adımda hata oluşursa MongoDB'de
 *   durumu `failed` olarak günceller ve BullMQ'nun retry mekanizmasını tetikler.
 * - Kaynak Temizliği: İşlem tamamlansa da hata alsa da geçici yükleme dosyalarını (`filePath`)
 *   diskten temizler.
 *
 * @example
 * ```typescript
 * import { ragWorker } from '#modules/rag/rag.worker.js';
 *
 * // Uygulama başlangıcında worker'ı ayağa kaldır
 * ragWorker.start();
 *
 * // Uygulama kapanışında graceful shutdown
 * await ragWorker.close();
 * ```
 */

import fs from 'node:fs/promises';
import { Worker, type Job, type ConnectionOptions } from 'bullmq';
import { env } from '#config/env.config.js';
import { ragRepository } from './rag.repository.js';
import { qdrantAdapter } from './qdrant.adapter.js';
import { extractorRegistry } from './extractors/extractor.registry.js';
import { recursiveChunker, type DocumentChunk } from './chunker.js';
import { embeddingService } from './embedding.service.js';
import {
  RAG_INGESTION_QUEUE_NAME,
  type DocumentIngestionJobData,
} from './rag.queue.js';

export class RagWorker {
  private worker: Worker<DocumentIngestionJobData> | null = null;
  private readonly queueName: string;
  private concurrency: number;
  private chunkSize = 1000;
  private chunkOverlap = 200;

  constructor(queueName = RAG_INGESTION_QUEUE_NAME, concurrency = 2) {
    this.queueName = queueName;
    this.concurrency = concurrency;
  }

  /**
   * Admin arayüzünden gelen yeni worker ayarlarını uygular (Hot-Reload).
   */
  updateConfig(config: { concurrency?: number; chunkSize?: number; chunkOverlap?: number }): void {
    if (config.concurrency !== undefined) {
      this.concurrency = config.concurrency;
      if (this.worker) {
        this.worker.concurrency = config.concurrency;
      }
    }
    if (config.chunkSize !== undefined) this.chunkSize = config.chunkSize;
    if (config.chunkOverlap !== undefined) this.chunkOverlap = config.chunkOverlap;
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

  /**
   * Tek bir doküman indeksleme görevini uçtan uca yürütür.
   *
   * @param job BullMQ iş nesnesi
   */
  async processJob(job: Job<DocumentIngestionJobData>): Promise<{ chunkCount: number; pointCount: number }> {
    const { documentId, filePath, filename, mimeType, allowedRoles } = job.data;

    try {
      // 1. Doküman durumunu 'processing' olarak güncelle
      await ragRepository.updateStatus(documentId, 'processing');

      // 2. Dosya ikili verisini diskten oku
      const fileBuffer = await fs.readFile(filePath);

      // 3. Strateji sicili üzerinden metin ve sayfaları ayıkla
      const extracted = await extractorRegistry.extract(fileBuffer, filename, mimeType);

      // 4. Rekürsif parçalama motoru ile chunk'lara ayır (Dinamik Admin Boyutlandırması)
      const chunkOptions = {
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap,
      };

      const chunks: DocumentChunk[] = extracted.pages && extracted.pages.length > 0
        ? recursiveChunker.splitPages(extracted.pages, chunkOptions)
        : recursiveChunker.splitText(extracted.text, chunkOptions);

      // 5. Vercel AI SDK ile vektör gömmelerini (embeddings) üret
      const points = await embeddingService.generateChunkEmbeddings(
        documentId,
        chunks,
        allowedRoles
      );

      // 6. Qdrant Vektör Veritabanı koleksiyonunu doğrula ve noktaları yükle
      await qdrantAdapter.ensureCollection();
      await qdrantAdapter.upsertPoints(points);

      // 7. Doküman durumunu 'completed' olarak güncelle
      await ragRepository.updateStatus(documentId, 'completed', {
        chunk_count: chunks.length,
      });

      return {
        chunkCount: chunks.length,
        pointCount: points.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      console.error(`[RagWorker] Doküman indeksleme başarısız (ID: ${documentId}):`, errorMessage);

      // Veritabanında durumu 'failed' yap
      await ragRepository.updateStatus(documentId, 'failed', {
        error_message: errorMessage,
      });

      throw error;
    } finally {
      // 8. Geçici dosyayı diskten temizle (hata alsa bile)
      await fs.unlink(filePath).catch(() => {
        // Dosya zaten silinmişse veya yoksa yoksay
      });
    }
  }

  /**
   * BullMQ Worker'ı başlatır ve kuyruğu dinlemeye alır.
   */
  start(): void {
    if (this.worker) return;

    this.worker = new Worker<DocumentIngestionJobData>(
      this.queueName,
      async (job) => await this.processJob(job),
      {
        connection: this.getRedisConnection(),
        concurrency: this.concurrency,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[RagWorker] İş başarıyla tamamlandı (Job ID: ${job.id}, Doc ID: ${job.data.documentId})`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(
        `[RagWorker] İş başarısız oldu (Job ID: ${job?.id}, Doc ID: ${job?.data.documentId}):`,
        err.message
      );
    });

    this.worker.on('error', (err) => {
      console.error(`[RagWorker] Worker hatası:`, err.message);
    });
  }

  /**
   * Worker'ın çalışıp çalışmadığını kontrol eder.
   */
  isHealthy(): boolean {
    return this.worker !== null && this.worker.isRunning();
  }

  /**
   * Uygulama kapanışında worker'ı zarifçe kapatır (Graceful Shutdown).
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}

export const ragWorker = new RagWorker();
