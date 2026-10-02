/**
 * @file rag-models.spec.ts
 * @description RAG Modülü Veri Modeli, DTO ve Repository Birim Testleri.
 */

import { describe, it, expect } from 'vitest';
import {
  uploadDocumentMetadataSchema,
  updateDocumentRolesSchema,
  listDocumentsQuerySchema,
  ragQuerySchema,
} from '#modules/rag/rag.dto.js';

describe('RAG DTO ve Validasyon Testleri', () => {
  it('Yükleme metadata şeması varsayılan allowed_roles ["*"] üretmelidir', () => {
    const parsed = uploadDocumentMetadataSchema.parse({});
    expect(parsed.allowed_roles).toEqual(['*']);
  });

  it('Yükleme metadata şemasında string olarak gelen roller JSON veya virgülle ayrıştırılabilmelidir', () => {
    const fromJson = uploadDocumentMetadataSchema.parse({
      allowed_roles: '["hr", "developer"]',
    });
    expect(fromJson.allowed_roles).toEqual(['hr', 'developer']);

    const fromComma = uploadDocumentMetadataSchema.parse({
      allowed_roles: 'legal, finance',
    });
    expect(fromComma.allowed_roles).toEqual(['legal', 'finance']);
  });

  it('updateDocumentRolesSchema boş dizi verildiğinde hata fırlatmalıdır', () => {
    const result = updateDocumentRolesSchema.safeParse({ allowed_roles: [] });
    expect(result.success).toBe(false);
  });

  it('ragQuerySchema geçerli arama parametrelerini doğrulamalıdır', () => {
    const valid = ragQuerySchema.parse({
      query: 'Kurumsal izin hakları',
      limit: '10',
      score_threshold: '0.7',
    });
    expect(valid.query).toBe('Kurumsal izin hakları');
    expect(valid.limit).toBe(10);
    expect(valid.score_threshold).toBe(0.7);
  });

  it('listDocumentsQuerySchema sayfalama parametrelerini coerce edip varsayılanları atamalıdır', () => {
    const valid = listDocumentsQuerySchema.parse({
      page: '2',
      limit: '50',
      status: 'completed',
    });
    expect(valid.page).toBe(2);
    expect(valid.limit).toBe(50);
    expect(valid.status).toBe('completed');
  });
});
