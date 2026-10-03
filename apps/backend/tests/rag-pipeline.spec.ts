import { describe, it, expect, beforeEach } from 'vitest';
import { plainTextExtractor } from '#modules/rag/extractors/plain-text.extractor.js';
import { extractorRegistry } from '#modules/rag/extractors/extractor.registry.js';
import { recursiveChunker } from '#modules/rag/chunker.js';
import {
  embeddingService,
  DEFAULT_EMBEDDING_DIMENSION,
} from '#modules/rag/embedding.service.js';
import { ValidationError } from '#shared/errors/index.js';

describe('RAG Ingestion Pipeline — Extractor, Chunker & Embedding Tests', () => {
  beforeEach(() => {
    // Testlerin izole ve deterministik çalışması için fallback modu aktif
    embeddingService.setFallbackMode(true);
  });

  describe('1. PlainTextExtractor & ExtractorRegistry', () => {
    it('metin dosyasını UTF-8 olarak okuyup sayfaları doğru yapılandırmalıdır', async () => {
      const sampleText = 'Birinci Sayfa İçeriği\fİkinci Sayfa İçeriği\fÜçüncü Sayfa';
      const buffer = Buffer.from(sampleText, 'utf-8');

      const extracted = await plainTextExtractor.extract(buffer, 'test.txt');

      expect(extracted.pageCount).toBe(3);
      expect(extracted.pages.length).toBe(3);
      expect(extracted.pages[0]?.pageNumber).toBe(1);
      expect(extracted.pages[0]?.text).toBe('Birinci Sayfa İçeriği');
      expect(extracted.pages[1]?.pageNumber).toBe(2);
      expect(extracted.metadata?.format).toBe('plain-text');
    });

    it('extractorRegistry doğru dosya formatına uygun extractor seçmelidir', () => {
      const txtExtractor = extractorRegistry.getExtractor('text/plain', 'belge.txt');
      expect(txtExtractor).toBeDefined();

      const pdfExtractor = extractorRegistry.getExtractor('application/pdf', 'dokuman.pdf');
      expect(pdfExtractor).toBeDefined();
    });

    it('desteklenmeyen bir dosya uzantısında ValidationError fırlatmalıdır', () => {
      expect(() => {
        extractorRegistry.getExtractor('application/x-msdownload', 'virus.exe');
      }).toThrowError(ValidationError);
    });
  });

  describe('2. RecursiveCharacterChunker', () => {
    it('metni belirtilen boyutta mantıksal sınırlardan parçalamalıdır', () => {
      const longText = [
        'Paragraf 1: Kurumsal yapay zeka sistemlerinde veri güvenliği en önemli kriterdir.',
        'Paragraf 2: Document ACL sayesinde sadece yetkili kullanıcılar ilgili döküman parçalarına erişebilir.',
        'Paragraf 3: Qdrant vektör veritabanı yüksek performanslı benzerlik aramaları sunar.',
        'Paragraf 4: Modüler monolit mimarisi servis bağımsızlığını ve sürdürülebilirliği garanti eder.',
      ].join('\n\n');

      const chunks = recursiveChunker.splitText(longText, {
        chunkSize: 120,
        chunkOverlap: 20,
      });

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      for (const chunk of chunks) {
        expect(chunk.characterCount).toBeLessThanOrEqual(150);
        expect(chunk.id).toBeDefined();
        expect(chunk.text.length).toBeGreaterThan(0);
      }
    });

    it('sayfa bazlı dökümanları sayfa numarasıyla eşleştirerek parçalamalıdır', () => {
      const pages = [
        { pageNumber: 1, text: 'Sayfa 1: Kurumsal mimari standartları ve güvenlik prensipleri.' },
        { pageNumber: 2, text: 'Sayfa 2: Rol bazlı erişim denetimi (RBAC) ve Vercel AI SDK entegrasyonu.' },
      ];

      const chunks = recursiveChunker.splitPages(pages, {
        chunkSize: 200,
        chunkOverlap: 30,
      });

      expect(chunks.length).toBe(2);
      expect(chunks[0]?.pageNumber).toBe(1);
      expect(chunks[1]?.pageNumber).toBe(2);
      expect(chunks[0]?.chunkIndex).toBe(0);
      expect(chunks[1]?.chunkIndex).toBe(1);
    });

    it('boş metin verildiğinde boş dizi döndürmelidir', () => {
      const emptyChunks = recursiveChunker.splitText('   \n\n   ');
      expect(emptyChunks).toEqual([]);
    });
  });

  describe('3. EmbeddingService', () => {
    it('arama sorgusu için normalize bir birim vektör üretmelidir', async () => {
      const query = 'İnsan kaynakları yönetmeliği';
      const vector = await embeddingService.generateQueryEmbedding(query);

      expect(vector.length).toBe(DEFAULT_EMBEDDING_DIMENSION);

      // Cosine benzerliği için norm = 1.0 (vektör birim uzunlukta olmalı)
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it('boş sorgu için sıfır vektörü döndürmelidir', async () => {
      const emptyVector = await embeddingService.generateQueryEmbedding('   ');
      expect(emptyVector.length).toBe(DEFAULT_EMBEDDING_DIMENSION);
      expect(emptyVector.every((v) => v === 0)).toBe(true);
    });

    it('doküman parçalarını QdrantPoint formatına doğru payload ve rollerle dönüştürmelidir', async () => {
      const documentId = 'doc_mongo_id_999';
      const allowedRoles = ['admin', 'hr_specialist'];
      const chunks = [
        {
          id: 'chunk_uuid_1',
          chunkIndex: 0,
          text: 'Çalışanlar yıllık izinlerini en az 2 hafta önceden bildirmelidir.',
          characterCount: 65,
          pageNumber: 1,
        },
        {
          id: 'chunk_uuid_2',
          chunkIndex: 1,
          text: 'İzin talepleri departman yöneticisi tarafından onaylanır.',
          characterCount: 56,
          pageNumber: 1,
        },
      ];

      const points = await embeddingService.generateChunkEmbeddings(
        documentId,
        chunks,
        allowedRoles
      );

      expect(points.length).toBe(2);

      const firstPoint = points[0]!;
      expect(firstPoint.id).toBe('chunk_uuid_1');
      expect(firstPoint.vector.length).toBe(DEFAULT_EMBEDDING_DIMENSION);
      expect(firstPoint.payload.document_id).toBe(documentId);
      expect(firstPoint.payload.chunk_index).toBe(0);
      expect(firstPoint.payload.allowed_roles).toEqual(allowedRoles);
      expect(firstPoint.payload.text).toBe(chunks[0]!.text);
      expect(firstPoint.payload.metadata?.page_number).toBe(1);
      expect(firstPoint.payload.metadata?.character_count).toBe(65);
    });
  });
});
