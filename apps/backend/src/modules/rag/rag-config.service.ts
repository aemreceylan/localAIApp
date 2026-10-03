/**
 * @file rag-config.service.ts
 * @description Admin RAG ve BullMQ Dinamik Yapılandırma Yönetim Servisi.
 * Adminlerin sistem çalışma ayarlarını dinamik olarak okumasını, güncellemesini
 * ve çalışma anında (hot-reload) worker/queue'ya yansıtmasını sağlar.
 *
 * Mimari Rol:
 * - Configuration Manager (Singleton Service): Veritabanı ile çalışma anı
 *   bellek durumunu senkronize eder; sunucu yeniden başlatılmasını gerektirmez.
 */

import {
  RagConfigModel,
  DEFAULT_RAG_CONFIG,
  type IRagConfig,
} from './rag-config.model.js';
import type { UpdateRagConfigInput } from './rag-config.dto.js';
import { ragQueue } from './rag.queue.js';
import { ragWorker } from './rag.worker.js';

export class RagConfigService {
  /**
   * Mevcut RAG ve BullMQ ayarlarını veritabanından getirir.
   * Kayıt yoksa varsayılan ayarlarla oluşturur.
   */
  async getConfig(): Promise<IRagConfig> {
    let config = await RagConfigModel.findOne({ key: DEFAULT_RAG_CONFIG.key });

    if (!config) {
      config = await RagConfigModel.create({
        key: DEFAULT_RAG_CONFIG.key,
        concurrency: DEFAULT_RAG_CONFIG.concurrency,
        attempts: DEFAULT_RAG_CONFIG.attempts,
        backoff_delay_ms: DEFAULT_RAG_CONFIG.backoff_delay_ms,
        chunk_size: DEFAULT_RAG_CONFIG.chunk_size,
        chunk_overlap: DEFAULT_RAG_CONFIG.chunk_overlap,
        remove_on_complete_count: DEFAULT_RAG_CONFIG.remove_on_complete_count,
        remove_on_fail_count: DEFAULT_RAG_CONFIG.remove_on_fail_count,
      });
    }

    return config;
  }

  /**
   * Admin tarafından iletilen yeni ayarları veritabanına kaydeder ve
   * çalışan Worker ile Queue'ya anında yansıtır (Hot-Reload).
   */
  async updateConfig(updates: UpdateRagConfigInput): Promise<IRagConfig> {
    const updatePayload: Record<string, unknown> = {};

    if (updates.concurrency !== undefined) updatePayload.concurrency = updates.concurrency;
    if (updates.attempts !== undefined) updatePayload.attempts = updates.attempts;
    if (updates.backoff_delay_ms !== undefined) updatePayload.backoff_delay_ms = updates.backoff_delay_ms;
    if (updates.chunk_size !== undefined) updatePayload.chunk_size = updates.chunk_size;
    if (updates.chunk_overlap !== undefined) updatePayload.chunk_overlap = updates.chunk_overlap;
    if (updates.remove_on_complete_count !== undefined) updatePayload.remove_on_complete_count = updates.remove_on_complete_count;
    if (updates.remove_on_fail_count !== undefined) updatePayload.remove_on_fail_count = updates.remove_on_fail_count;

    const updatedConfig = await RagConfigModel.findOneAndUpdate(
      { key: DEFAULT_RAG_CONFIG.key },
      { $set: updatePayload },
      { new: true, upsert: true, returnDocument: 'after' }
    );

    // 1. Worker ayarlarını anında güncelle (Hot-Reload)
    ragWorker.updateConfig({
      concurrency: updatedConfig.concurrency,
      chunkSize: updatedConfig.chunk_size,
      chunkOverlap: updatedConfig.chunk_overlap,
    });

    // 2. Queue varsayılan seçeneklerini anında güncelle (Hot-Reload)
    ragQueue.updateJobOptions({
      attempts: updatedConfig.attempts,
      backoffDelay: updatedConfig.backoff_delay_ms,
      removeOnCompleteCount: updatedConfig.remove_on_complete_count,
      removeOnFailCount: updatedConfig.remove_on_fail_count,
    });

    return updatedConfig;
  }

  /**
   * Sunucu başlangıcında kayıtlı son ayarları kuyruk ve worker'a yükler.
   */
  async initializeRuntimeConfig(): Promise<void> {
    try {
      const config = await this.getConfig();
      ragWorker.updateConfig({
        concurrency: config.concurrency,
        chunkSize: config.chunk_size,
        chunkOverlap: config.chunk_overlap,
      });
      ragQueue.updateJobOptions({
        attempts: config.attempts,
        backoffDelay: config.backoff_delay_ms,
        removeOnCompleteCount: config.remove_on_complete_count,
        removeOnFailCount: config.remove_on_fail_count,
      });
    } catch (err) {
      console.warn('[RagConfigService] Başlangıç ayarları yüklenemedi, varsayılanlar devrede:', err);
    }
  }
}

export const ragConfigService = new RagConfigService();
