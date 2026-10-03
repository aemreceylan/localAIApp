import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamText } from 'ai';
import request from 'supertest';
import app from '#app.js';
import { chatService } from '#modules/chat/chat.service.js';
import { ragService } from '#modules/rag/rag.service.js';
import { promptService } from '#modules/prompt/prompt.service.js';
import * as aiModule from '#modules/ai/index.js';
import { authService } from '#modules/auth/index.js';
import type { ChatRequestDto } from '#modules/chat/chat.dto.js';

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    streamText: vi.fn(),
  };
});

describe('Chat RAG Entegrasyonu & 4. Katman Grounding Testleri', () => {
  beforeEach(() => {
    vi.mocked(streamText).mockReturnValue({
      pipeDataStreamToResponse: vi.fn().mockImplementation((res: any) => {
        if (!res.headersSent) {
          res.writeHead?.(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        res.end?.();
      }),
      textStream: (async function* () {
        yield 'Mock yanıt';
      })(),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enableRag: false olduğunda RAG araması yapılmamalıdır', async () => {
    const queryKnowledgeSpy = vi.spyOn(ragService, 'queryKnowledge');
    const buildSystemPromptSpy = vi.spyOn(promptService, 'buildSystemPrompt').mockResolvedValue(undefined);

    // Mock getModel
    vi.spyOn(aiModule, 'getModel').mockReturnValue({} as any);

    const dto: ChatRequestDto = {
      model: 'mock-provider/mock-model',
      messages: [{ role: 'user', content: 'Merhaba, bana bilgi ver.' }],
      enableRag: false,
    };

    const result = await chatService.streamChat(dto, {
      id: 'user_123',
      roles: ['engineer'],
      system_role: 'user',
    });

    expect(queryKnowledgeSpy).not.toHaveBeenCalled();
    expect(result.citations).toEqual([]);
    expect(buildSystemPromptSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userRoles: ['engineer'],
      })
    );
    // ragContext parametresi undefined olmalı
    expect(buildSystemPromptSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        ragContext: expect.any(String),
      })
    );
  });

  it('enableRag: true olduğunda son kullanıcı mesajı ile RAG araması yapılmalı ve alıntılar sistem promptuna eklenmelidir', async () => {
    const mockCitations = [
      {
        documentId: 'doc_123',
        documentTitle: 'İK El Kitabı 2026',
        chunkIndex: 0,
        text: 'Çalışanlar yıllık 20 gün ücretli izin hakkına sahiptir.',
        score: 0.88,
        pageNumber: 12,
      },
    ];

    const queryKnowledgeSpy = vi.spyOn(ragService, 'queryKnowledge').mockResolvedValue({
      query: 'Yıllık izin hakkım kaç gün?',
      totalMatches: 1,
      citations: mockCitations,
    });

    let capturedSystemPromptOptions: any;
    vi.spyOn(promptService, 'buildSystemPrompt').mockImplementation(async (options) => {
      capturedSystemPromptOptions = options;
      return 'Mock system prompt with grounding';
    });

    vi.spyOn(aiModule, 'getModel').mockReturnValue({} as any);

    const dto: ChatRequestDto = {
      model: 'mock-provider/mock-model',
      messages: [
        { role: 'user', content: 'Selam' },
        { role: 'assistant', content: 'Merhaba! Nasıl yardımcı olabilirim?' },
        { role: 'user', content: 'Yıllık izin hakkım kaç gün?' },
      ],
      enableRag: true,
      ragDocumentIds: ['doc_123'],
      ragScoreThreshold: 0.7,
    };

    const userContext = {
      id: 'user_123',
      roles: ['hr', 'employee'],
      system_role: 'user',
    };

    const result = await chatService.streamChat(dto, userContext);

    // 1. RAG sorgusu doğru parametrelerle çağrıldı mı?
    expect(queryKnowledgeSpy).toHaveBeenCalledWith(
      {
        query: 'Yıllık izin hakkım kaç gün?',
        limit: 5,
        score_threshold: 0.7,
        document_ids: ['doc_123'],
      },
      expect.objectContaining({
        _id: 'user_123',
        roles: ['hr', 'employee'],
        system_role: 'user',
      })
    );

    // 2. Alıntılar döndürüldü mü?
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]?.documentTitle).toBe('İK El Kitabı 2026');

    // 3. Prompt Stacking 4. Katmanı (ragContext) formatlandı mı?
    expect(capturedSystemPromptOptions).toBeDefined();
    expect(capturedSystemPromptOptions.ragContext).toContain('[REFERANS 1 - İK El Kitabı 2026 (Sayfa: 12) | Güven: %88.0]');
    expect(capturedSystemPromptOptions.ragContext).toContain('Çalışanlar yıllık 20 gün ücretli izin hakkına sahiptir.');
  });

  it('RAG servisi hata fırlattığında ana sohbet akışı kesilmemeli, hata tolere edilmelidir', async () => {
    vi.spyOn(ragService, 'queryKnowledge').mockRejectedValue(new Error('Qdrant bağlantı hatası'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.spyOn(promptService, 'buildSystemPrompt').mockResolvedValue(undefined);
    vi.spyOn(aiModule, 'getModel').mockReturnValue({} as any);

    const dto: ChatRequestDto = {
      model: 'mock-provider/mock-model',
      messages: [{ role: 'user', content: 'RAG çalışmasa da cevap ver.' }],
      enableRag: true,
    };

    const result = await chatService.streamChat(dto, {
      id: 'user_123',
      roles: ['general'],
      system_role: 'user',
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ChatService] RAG bilgi bankası sorgulanırken hata oluştu:'),
      expect.any(Error)
    );
    expect(result.citations).toEqual([]);
    expect(result.streamResult).toBeDefined();
  });

  it('POST /api/chat ile RAG aktif istek gönderildiğinde citations headerı ve stream yanıtı başarıyla dönmelidir', async () => {
    vi.spyOn(ragService, 'queryKnowledge').mockResolvedValue({
      query: 'Kurumsal izin politikası nedir?',
      totalMatches: 2,
      citations: [
        {
          documentId: 'doc_1',
          chunkIndex: 0,
          text: 'Referans 1',
          score: 0.9,
        },
        {
          documentId: 'doc_2',
          chunkIndex: 1,
          text: 'Referans 2',
          score: 0.85,
        },
      ],
    });
    vi.spyOn(promptService, 'buildSystemPrompt').mockResolvedValue(undefined);
    vi.spyOn(aiModule, 'getModel').mockReturnValue({} as any);
    vi.spyOn(authService, 'validateToken').mockResolvedValue({
      user: {
        _id: 'mock_user_id',
        email: 'tester@test.local',
        system_role: 'user',
        roles: ['developer'],
        is_active: true,
      } as any,
      session: {
        expires_at: new Date(Date.now() + 86400000),
      } as any,
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer mock_token')
      .send({
        model: 'mock-provider/mock-model',
        messages: [{ role: 'user', content: 'Kurumsal izin politikası nedir?' }],
        enableRag: true,
      });

    expect(res.status).toBe(200);
    expect(res.headers['x-nexusai-citations-count']).toBe('2');
  });
});
