import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ragConfigService,
  updateRagConfigSchema,
  DEFAULT_RAG_CONFIG,
  RagConfigModel,
  bullBoardRouter,
  ragWorker,
  ragQueue,
} from '#modules/rag/index.js';

describe('RAG Admin Configuration & Bull-Board Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Zod DTO Validasyon Kuralları', () => {
    it('geçerli ayarları başarıyla ayrıştırmalıdır', () => {
      const valid = updateRagConfigSchema.parse({
        concurrency: 4,
        attempts: 5,
        backoff_delay_ms: 3000,
        chunk_size: 1500,
        chunk_overlap: 300,
      });

      expect(valid.concurrency).toBe(4);
      expect(valid.attempts).toBe(5);
      expect(valid.chunk_size).toBe(1500);
      expect(valid.chunk_overlap).toBe(300);
    });

    it('chunk_overlap değeri chunk_size değerine eşit veya büyük olduğunda hata fırlatmalıdır', () => {
      expect(() => {
        updateRagConfigSchema.parse({
          chunk_size: 500,
          chunk_overlap: 500,
        });
      }).toThrowError(/chunk_overlap değeri chunk_size değerinden küçük olmalıdır/);

      expect(() => {
        updateRagConfigSchema.parse({
          chunk_size: 500,
          chunk_overlap: 600,
        });
      }).toThrowError(/chunk_overlap değeri chunk_size değerinden küçük olmalıdır/);
    });

    it('sınır değerleri aşıldığında hata fırlatmalıdır', () => {
      expect(() => {
        updateRagConfigSchema.parse({ concurrency: 0 });
      }).toThrow();

      expect(() => {
        updateRagConfigSchema.parse({ concurrency: 11 });
      }).toThrow();
    });
  });

  describe('2. RagConfigService Dinamik Hot-Reload', () => {
    it('veritabanında kayıt yoksa varsayılan ayarları döndürmelidir', async () => {
      vi.spyOn(RagConfigModel, 'findOne').mockResolvedValue(null as any);
      vi.spyOn(RagConfigModel, 'create').mockResolvedValue({
        ...DEFAULT_RAG_CONFIG,
        updated_at: new Date(),
      } as any);

      const config = await ragConfigService.getConfig();

      expect(config.concurrency).toBe(DEFAULT_RAG_CONFIG.concurrency);
      expect(config.attempts).toBe(DEFAULT_RAG_CONFIG.attempts);
      expect(config.chunk_size).toBe(DEFAULT_RAG_CONFIG.chunk_size);
    });

    it('updateConfig ayarları güncellemeli ve worker ile queue ya anında yansıtmalıdır', async () => {
      const updatedMock = {
        key: DEFAULT_RAG_CONFIG.key,
        concurrency: 5,
        attempts: 4,
        backoff_delay_ms: 4000,
        chunk_size: 1200,
        chunk_overlap: 250,
        remove_on_complete_count: 500,
        remove_on_fail_count: 2000,
        updated_at: new Date(),
      };

      vi.spyOn(RagConfigModel, 'findOneAndUpdate').mockResolvedValue(updatedMock as any);
      const workerSpy = vi.spyOn(ragWorker, 'updateConfig');
      const queueSpy = vi.spyOn(ragQueue, 'updateJobOptions');

      const result = await ragConfigService.updateConfig({
        concurrency: 5,
        attempts: 4,
        chunk_size: 1200,
        chunk_overlap: 250,
      });

      expect(result.concurrency).toBe(5);
      expect(workerSpy).toHaveBeenCalledWith({
        concurrency: 5,
        chunkSize: 1200,
        chunkOverlap: 250,
      });
      expect(queueSpy).toHaveBeenCalledWith({
        attempts: 4,
        backoffDelay: 4000,
        removeOnCompleteCount: 500,
        removeOnFailCount: 2000,
      });
    });
  });

  describe('3. Bull-Board Express Router Entegrasyonu', () => {
    it('Bull-Board router başarıyla oluşturulmuş ve Express middleware olarak kullanılabilir olmalıdır', () => {
      expect(bullBoardRouter).toBeDefined();
      expect(typeof bullBoardRouter).toBe('function');
    });
  });
});
