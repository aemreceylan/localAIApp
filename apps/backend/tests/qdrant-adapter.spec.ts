/**
 * @file qdrant-adapter.spec.ts
 * @description Qdrant Vektör Adaptörü ve Zero-Context-Leakage Rol İzolasyonu Testleri.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QdrantAdapter, type QdrantPoint } from '#modules/rag/qdrant.adapter.js';

describe('QdrantAdapter & Zero-Context-Leakage Vektör Güvenliği Testleri', () => {
  let adapter: QdrantAdapter;

  beforeEach(() => {
    adapter = new QdrantAdapter({ useMemoryFallback: true });
    adapter.clearMemoryStore();
  });

  it('ensureCollection başarılı bir şekilde tamamlanmalıdır', async () => {
    const result = await adapter.ensureCollection(1536);
    expect(result).toBe(true);
  });

  it('Zero-Context-Leakage: Yalnızca yetkili rollerin dokümanları semantik arama sonuçlarında dönmelidir', async () => {
    // 1. Üç farklı dokümana ait vektörleri yükle
    const points: QdrantPoint[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        vector: [1.0, 0.0, 0.0],
        payload: {
          document_id: 'doc_hr',
          chunk_index: 0,
          text: 'İK Disiplin ve İzin Yönetmeliği',
          allowed_roles: ['hr'],
          metadata: { title: 'İK Rehberi' },
        },
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        vector: [0.95, 0.05, 0.0],
        payload: {
          document_id: 'doc_dev',
          chunk_index: 0,
          text: 'Yazılım Mimarisi ve API Anahtarları',
          allowed_roles: ['developer'],
          metadata: { title: 'Geliştirici Dokümanı' },
        },
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        vector: [0.9, 0.1, 0.0],
        payload: {
          document_id: 'doc_public',
          chunk_index: 0,
          text: 'Kurumsal Çalışma Saatleri ve Genel Kurallar',
          allowed_roles: ['*'],
          metadata: { title: 'Genel Şirket Kuralları' },
        },
      },
    ];

    await adapter.upsertPoints(points);

    // 2. HR Rolündeki Kullanıcı Arama Yapıyor
    const queryVector = [1.0, 0.0, 0.0];
    const hrResults = await adapter.searchWithRoleFilter(queryVector, ['hr'], false, {
      scoreThreshold: 0.5,
    });

    const hrDocIds = hrResults.map((r) => r.payload.document_id);
    expect(hrDocIds).toContain('doc_hr');
    expect(hrDocIds).toContain('doc_public');
    expect(hrDocIds).not.toContain('doc_dev'); // Developer dokümanı KESİNLİKLE sızmamalı!

    // 3. Developer Rolündeki Kullanıcı Arama Yapıyor
    const devResults = await adapter.searchWithRoleFilter(queryVector, ['developer'], false, {
      scoreThreshold: 0.5,
    });
    const devDocIds = devResults.map((r) => r.payload.document_id);
    expect(devDocIds).toContain('doc_dev');
    expect(devDocIds).toContain('doc_public');
    expect(devDocIds).not.toContain('doc_hr'); // HR dokümanı KESİNLİKLE sızmamalı!

    // 4. Superadmin Arama Yapıyor (Root Bypass)
    const adminResults = await adapter.searchWithRoleFilter(queryVector, [], true, {
      scoreThreshold: 0.5,
    });
    const adminDocIds = adminResults.map((r) => r.payload.document_id);
    expect(adminDocIds).toContain('doc_hr');
    expect(adminDocIds).toContain('doc_dev');
    expect(adminDocIds).toContain('doc_public');
  });

  it('updatePointsRoles ile rol güncellendiğinde arama izinleri anında değişmelidir', async () => {
    const points: QdrantPoint[] = [
      {
        id: '44444444-4444-4444-4444-444444444444',
        vector: [1.0, 0.0, 0.0],
        payload: {
          document_id: 'doc_finance',
          chunk_index: 0,
          text: '2026 Bütçe Raporu',
          allowed_roles: ['finance'],
        },
      },
    ];
    await adapter.upsertPoints(points);

    // Başlangıçta HR kullanıcısı erişememeli
    const beforeUpdate = await adapter.searchWithRoleFilter([1.0, 0.0, 0.0], ['hr'], false);
    expect(beforeUpdate).toHaveLength(0);

    // İzinli rollere 'hr' eklensin
    await adapter.updatePointsRoles('doc_finance', ['finance', 'hr']);

    // Güncelleme sonrası HR kullanıcısı erişebilmeli
    const afterUpdate = await adapter.searchWithRoleFilter([1.0, 0.0, 0.0], ['hr'], false);
    expect(afterUpdate).toHaveLength(1);
    expect(afterUpdate[0]?.payload.document_id).toBe('doc_finance');
  });

  it('deletePointsByDocumentId dokümana ait tüm vektörleri temizlemelidir', async () => {
    const points: QdrantPoint[] = [
      {
        id: '55555555-5555-5555-5555-555555555555',
        vector: [1.0, 0.0, 0.0],
        payload: {
          document_id: 'doc_to_delete',
          chunk_index: 0,
          text: 'Eski Sözleşme',
          allowed_roles: ['*'],
        },
      },
    ];
    await adapter.upsertPoints(points);

    await adapter.deletePointsByDocumentId('doc_to_delete');

    const searchAfterDelete = await adapter.searchWithRoleFilter([1.0, 0.0, 0.0], ['*'], true);
    expect(searchAfterDelete).toHaveLength(0);
  });

  it('scoreThreshold eşiği altında kalan alakasız sonuçlar filtrelenmelidir', async () => {
    const points: QdrantPoint[] = [
      {
        id: '66666666-6666-6666-6666-666666666666',
        vector: [0.0, 1.0, 0.0], // Sorgu vektörüne [1,0,0] dik (Cosine = 0)
        payload: {
          document_id: 'doc_orthogonal',
          chunk_index: 0,
          text: 'Tamamen alakasız metin',
          allowed_roles: ['*'],
        },
      },
    ];
    await adapter.upsertPoints(points);

    const results = await adapter.searchWithRoleFilter([1.0, 0.0, 0.0], ['*'], true, {
      scoreThreshold: 0.5,
    });
    expect(results).toHaveLength(0);
  });

  it('Canlı Qdrant Docker konteyneri ile entegrasyonu doğrulamalıdır', async () => {
    const liveAdapter = new QdrantAdapter();
    const isHealthy = await liveAdapter.isHealthy();
    if (!isHealthy) {
      // Qdrant konteyneri yerel ortamda başlatılmamışsa testi zarifçe atla
      return;
    }

    const collectionReady = await liveAdapter.ensureCollection(1536);
    expect(collectionReady).toBe(true);
  });
});
