import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Job } from 'bullmq';
import { ragQueue, type DocumentIngestionJobData } from '#modules/rag/rag.queue.js';
import { RagWorker } from '#modules/rag/rag.worker.js';
import { ragRepository } from '#modules/rag/rag.repository.js';
import { qdrantAdapter } from '#modules/rag/qdrant.adapter.js';
import { embeddingService } from '#modules/rag/embedding.service.js';

describe('RAG Ingestion Pipeline — BullMQ Queue & Worker Tests', () => {
  let tempFilePath: string;
  let worker: RagWorker;

  beforeEach(async () => {
    // İzole ve deterministik vektör üretimi
    embeddingService.setFallbackMode(true);

    // Qdrant in-memory modu
    qdrantAdapter.setMemoryFallback(true);
    qdrantAdapter.clearMemoryStore();

    worker = new RagWorker('test-rag-ingestion', 1);

    // Test için geçici bir metin belgesi oluştur
    tempFilePath = path.join(os.tmpdir(), `test-rag-doc-${Date.now()}.txt`);
    const sampleContent = [
      'Bölüm 1: Kurumsal Güvenlik İlkeleri ve Rol Matrisi.',
      'Bölüm 2: Bilgi Bankası ve Vektör Veritabanı İzolasyonu.',
      'Bölüm 3: Document ACL kuralları uyarınca yetkilendirme.',
    ].join('\n\n');

    await fs.writeFile(tempFilePath, sampleContent, 'utf-8');
  });

  afterEach(async () => {
    // Kalan geçici dosyayı temizle
    await fs.unlink(tempFilePath).catch(() => {});
    await worker.close();
    await ragQueue.close();
    vi.restoreAllMocks();
  });

  describe('1. RagQueue Redis Entegrasyonu', () => {
    it('Redis çalışırken ragQueue.isHealthy() true dönmelidir', async () => {
      const healthy = await ragQueue.isHealthy();
      expect(healthy).toBe(true);
    });

    it('Kuyruğa doküman indeksleme işi başarıyla eklenebilmelidir', async () => {
      const jobData: DocumentIngestionJobData = {
        documentId: 'doc_mongo_test_123',
        filePath: tempFilePath,
        filename: 'politika.txt',
        mimeType: 'text/plain',
        allowedRoles: ['admin', 'security'],
      };

      const job = await ragQueue.addIngestionJob(jobData);
      expect(job.id).toBeDefined();
      expect(job.data.documentId).toBe('doc_mongo_test_123');
      expect(job.data.allowedRoles).toEqual(['admin', 'security']);
    });
  });

  describe('2. RagWorker processJob İş Akışı', () => {
    it('dokümanı uçtan uca işlemeli, Qdrant noktalarını yüklemeli ve geçici dosyayı silmelidir', async () => {
      const documentId = 'doc_mongo_test_process';
      const allowedRoles = ['hr', 'manager'];

      // Repository durum güncellemelerini takip et
      const updateStatusSpy = vi
        .spyOn(ragRepository, 'updateStatus')
        .mockResolvedValue({} as any);

      // Qdrant upsertPoints metodunu takip et
      const upsertSpy = vi.spyOn(qdrantAdapter, 'upsertPoints');

      const mockJob = {
        id: 'job_1',
        data: {
          documentId,
          filePath: tempFilePath,
          filename: 'politika.txt',
          mimeType: 'text/plain',
          allowedRoles,
        },
      } as unknown as Job<DocumentIngestionJobData>;

      const result = await worker.processJob(mockJob);

      // 1. Sonuç parçaları ve noktaları üretilmiş olmalı
      expect(result.chunkCount).toBeGreaterThanOrEqual(1);
      expect(result.pointCount).toBe(result.chunkCount);

      // 2. Durum sırasıyla 'processing' ve 'completed' yapılmış olmalı
      expect(updateStatusSpy).toHaveBeenCalledWith(documentId, 'processing');
      expect(updateStatusSpy).toHaveBeenCalledWith(documentId, 'completed', {
        chunk_count: result.chunkCount,
      });

      // 3. Qdrant'a yükleme çağrılmış olmalı
      expect(upsertSpy).toHaveBeenCalled();

      // 4. Geçici dosya diskten temizlenmiş olmalı
      const fileExists = await fs
        .access(tempFilePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('dosya okunamadığında doküman durumunu failed yapmalı ve hatayı fırlatmalıdır', async () => {
      const documentId = 'doc_mongo_test_error';

      const updateStatusSpy = vi
        .spyOn(ragRepository, 'updateStatus')
        .mockResolvedValue({} as any);

      const mockJob = {
        id: 'job_err',
        data: {
          documentId,
          filePath: path.join(os.tmpdir(), 'non_existent_file_xyz.pdf'),
          filename: 'non_existent.pdf',
          mimeType: 'application/pdf',
          allowedRoles: ['admin'],
        },
      } as unknown as Job<DocumentIngestionJobData>;

      await expect(worker.processJob(mockJob)).rejects.toThrow();

      // 'failed' olarak güncellenmiş olmalı
      expect(updateStatusSpy).toHaveBeenCalledWith(
        documentId,
        'failed',
        expect.objectContaining({
          error_message: expect.any(String),
        })
      );
    });
  });
});
