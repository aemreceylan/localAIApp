import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  ragService,
  ragRepository,
  ragQueue,
  qdrantAdapter,
  embeddingService,
  type IDocument,
} from '#modules/rag/index.js';
import { ValidationError, ForbiddenError, NotFoundError } from '#shared/errors/index.js';
import type { IUser } from '#modules/auth/user.model.js';

describe('RAG Service — Uçtan Uca İş Mantığı ve Zero-Context-Leakage Testleri', () => {
  const mockUser: IUser & { _id: Types.ObjectId } = {
    _id: new Types.ObjectId(),
    email: 'user@nexusai.local',
    username: 'test_user',
    name: 'Test Kullanıcı',
    roles: ['hr_specialist'],
    system_role: 'user',
    is_active: true,
    is_banned: false,
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const mockAdminUser: IUser & { _id: Types.ObjectId } = {
    ...mockUser,
    _id: new Types.ObjectId(),
    roles: ['admin'],
    system_role: 'superadmin',
  } as any;

  beforeEach(() => {
    vi.restoreAllMocks();
    embeddingService.setFallbackMode(true);
  });

  describe('1. uploadDocument', () => {
    it('dosya seçilmediğinde ValidationError fırlatmalıdır', async () => {
      await expect(
        ragService.uploadDocument(undefined, { allowed_roles: ['*'] }, mockUser)
      ).rejects.toThrowError(ValidationError);
    });

    it('dosya ve üst veriyle MongoDB kaydı açmalı ve BullMQ ya iş eklemelidir', async () => {
      const mockFile = {
        originalname: 'IK_Rehberi.pdf',
        path: '/tmp/ik_rehberi_123.pdf',
        size: 1024,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      const createdDoc: Partial<IDocument> = {
        _id: new Types.ObjectId(),
        title: 'İK El Kitabı 2026',
        file_name: 'IK_Rehberi.pdf',
        status: 'pending',
        allowed_roles: ['hr_specialist'],
      };

      const repoSpy = vi.spyOn(ragRepository, 'create').mockResolvedValue(createdDoc as any);
      const queueSpy = vi.spyOn(ragQueue, 'addIngestionJob').mockResolvedValue({ id: 'job_101' } as any);

      const result = await ragService.uploadDocument(
        mockFile,
        { title: 'İK El Kitabı 2026', allowed_roles: ['hr_specialist'] },
        mockUser
      );

      expect(repoSpy).toHaveBeenCalled();
      expect(queueSpy).toHaveBeenCalledWith({
        documentId: createdDoc._id!.toString(),
        filePath: mockFile.path,
        filename: mockFile.originalname,
        mimeType: mockFile.mimetype,
        allowedRoles: ['hr_specialist'],
      });
      expect(result.status).toBe('pending');
    });
  });

  describe('2. listDocuments (Zero-Context-Leakage)', () => {
    it('kullanıcının rolüne göre yetkili olduğu dokümanları sayfalı getirmelidir', async () => {
      const mockDocs = [{ title: 'İK Rehberi' }, { title: 'Şirket Politikası' }];
      vi.spyOn(ragRepository, 'findAuthorizedDocuments').mockResolvedValue({
        documents: mockDocs as any,
        total: 2,
      });

      const result = await ragService.listDocuments({ page: 1, limit: 10 }, mockUser);

      expect(result.documents.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });
  });

  describe('3. getDocumentById & Document ACL Güvenliği', () => {
    it('doküman bulunamazsa NotFoundError fırlatmalıdır', async () => {
      vi.spyOn(ragRepository, 'findById').mockResolvedValue(null);

      await expect(
        ragService.getDocumentById('doc_unknown', mockUser)
      ).rejects.toThrowError(NotFoundError);
    });

    it('kullanıcının rolü dokümanın allowed_roles listesinde yoksa ForbiddenError fırlatmalıdır', async () => {
      const restrictedDoc: Partial<IDocument> = {
        _id: new Types.ObjectId(),
        title: 'Mali Bütçe',
        allowed_roles: ['finance_manager'], // Kullanıcı hr_specialist
      };
      vi.spyOn(ragRepository, 'findById').mockResolvedValue(restrictedDoc as any);

      await expect(
        ragService.getDocumentById('doc_finance', mockUser)
      ).rejects.toThrowError(ForbiddenError);
    });

    it('Superadmin kullanıcı rol kısıtlamasına takılmadan dokümana erişebilmelidir', async () => {
      const restrictedDoc: Partial<IDocument> = {
        _id: new Types.ObjectId(),
        title: 'Mali Bütçe',
        allowed_roles: ['finance_manager'],
      };
      vi.spyOn(ragRepository, 'findById').mockResolvedValue(restrictedDoc as any);

      const doc = await ragService.getDocumentById('doc_finance', mockAdminUser);
      expect(doc.title).toBe('Mali Bütçe');
    });
  });

  describe('4. updateDocumentRoles & deleteDocument Senkronizasyonu', () => {
    it('updateDocumentRoles hem MongoDB yi hem Qdrant vektör rollerini güncellemelidir', async () => {
      const docId = new Types.ObjectId();
      const mockDoc: Partial<IDocument> = {
        _id: docId,
        title: 'Genel Proje Standartları',
        allowed_roles: ['developer'],
      };

      vi.spyOn(ragRepository, 'findById').mockResolvedValue(mockDoc as any);
      const updateRepoSpy = vi
        .spyOn(ragRepository, 'updateAllowedRoles')
        .mockResolvedValue({ ...mockDoc, allowed_roles: ['developer', 'qa'] } as any);
      const updateQdrantSpy = vi
        .spyOn(qdrantAdapter, 'updatePointsRoles')
        .mockResolvedValue(true);

      const updated = await ragService.updateDocumentRoles(
        docId.toString(),
        ['developer', 'qa'],
        mockAdminUser
      );

      expect(updateRepoSpy).toHaveBeenCalledWith(docId, ['developer', 'qa']);
      expect(updateQdrantSpy).toHaveBeenCalledWith(docId.toString(), ['developer', 'qa']);
      expect(updated.allowed_roles).toEqual(['developer', 'qa']);
    });

    it('deleteDocument hem MongoDB kaydını hem Qdrant noktalarını silmelidir', async () => {
      const docId = new Types.ObjectId();
      const mockDoc: Partial<IDocument> = {
        _id: docId,
        title: 'Silinecek Doküman',
        allowed_roles: ['*'],
      };

      vi.spyOn(ragRepository, 'findById').mockResolvedValue(mockDoc as any);
      const deleteRepoSpy = vi.spyOn(ragRepository, 'deleteById').mockResolvedValue(mockDoc as any);
      const deleteQdrantSpy = vi
        .spyOn(qdrantAdapter, 'deletePointsByDocumentId')
        .mockResolvedValue(true);

      const result = await ragService.deleteDocument(docId.toString(), mockAdminUser);

      expect(deleteRepoSpy).toHaveBeenCalledWith(docId);
      expect(deleteQdrantSpy).toHaveBeenCalledWith(docId.toString());
      expect(result.success).toBe(true);
    });
  });

  describe('5. queryKnowledge Semantik Arama', () => {
    it('arama sorgusu için embedding üretmeli ve Qdrant sonuçlarını alıntı formatında döndürmelidir', async () => {
      const mockQdrantResults = [
        {
          id: 'point_uuid_1',
          score: 0.88,
          payload: {
            document_id: 'doc_123',
            chunk_index: 0,
            text: 'Yıllık izin hakkı 1 yılını dolduran personele 14 iş günüdür.',
            allowed_roles: ['hr_specialist'],
            metadata: { page_number: 3 },
          },
        },
      ];

      vi.spyOn(qdrantAdapter, 'searchWithRoleFilter').mockResolvedValue(mockQdrantResults as any);

      const result = await ragService.queryKnowledge(
        { query: 'Yıllık izin süresi kaç gün?', limit: 3, score_threshold: 0.6 },
        mockUser
      );

      expect(result.totalMatches).toBe(1);
      expect(result.citations[0]?.documentId).toBe('doc_123');
      expect(result.citations[0]?.pageNumber).toBe(3);
      expect(result.citations[0]?.score).toBe(0.88);
    });
  });
});
