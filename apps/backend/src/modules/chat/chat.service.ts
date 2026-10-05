import { streamText } from 'ai';
import { getModel, aiProviderRegistry } from '#modules/ai/index.js';
import { LLMProviderError, NotFoundError, ValidationError, AppError } from '#shared/errors/index.js';
import { chatRepository } from '#modules/chat/chat.repository.js';
import { promptService } from '#modules/prompt/index.js';
import { ragService, type RagCitation } from '#modules/rag/index.js';
import { telemetryService } from '#modules/telemetry/index.js';
import { promptGuard } from '#shared/security/index.js';
import type { ChatMessageDto, ChatRequestDto, CreateSessionDto } from '#modules/chat/chat.dto.js';

interface SessionContext {
  promptId: string | undefined;
  customInstructions: string | undefined;
  model: string | undefined;
}

export interface StreamChatResult {
  streamResult: ReturnType<typeof streamText>;
  citations: RagCitation[];
}

export class ChatService {
  /**
   * Yeni bir sohbet oturumu oluşturur. Model seçimi zorunludur.
   */
  async createSession(dto: CreateSessionDto, user_id: string) {
    if (!user_id) {
      throw new ValidationError('Oturum oluşturmak için kullanıcı kimliği zorunludur.');
    }
    if (dto.customInstructions) {
      promptGuard.assertSafe(dto.customInstructions);
    }
    return await chatRepository.createConversation({
      user_id,
      title: dto.title || 'Yeni Sohbet',
      model: dto.model,
      ...(dto.promptId ? { prompt_id: dto.promptId } : {}),
      ...(dto.customInstructions ? { custom_instructions: dto.customInstructions } : {}),
    });
  }

  /**
   * Kullanıcıya ait oturumları listeler.
   */
  async getSessions(user_id: string) {
    if (!user_id) return [];
    return await chatRepository.getConversations(user_id);
  }

  /**
   * Tekil oturum detayını getirir.
   */
  async getSessionById(id: string, user_id: string) {
    const session = await chatRepository.getConversationById(id, user_id);
    if (!session) {
      throw new NotFoundError(`Sohbet oturumu bulunamadı: ${id}`);
    }
    return session;
  }

  /**
   * Oturumu ve mesajlarını siler.
   */
  async deleteSession(id: string, user_id: string) {
    const deleted = await chatRepository.deleteConversation(id, user_id);
    if (!deleted) {
      throw new NotFoundError(`Silinecek sohbet oturumu bulunamadı: ${id}`);
    }
    return { success: true, message: 'Oturum başarıyla silindi.' };
  }

  /**
   * Oturuma ait mesaj geçmişini getirir.
   */
  async getSessionMessages(conversationId: string, user_id: string) {
    await this.getSessionById(conversationId, user_id);
    return await chatRepository.getMessagesByConversationId(conversationId);
  }

  /**
   * Sistemde ve sağlayıcılarda anlık kullanılabilir olan modelleri listeler.
   */
  async getAvailableModels() {
    const models = await aiProviderRegistry.getAvailableModels();
    const defaultProviderId = aiProviderRegistry.getDefaultProviderId();
    const defaultModel = defaultProviderId
      ? models.find((m) => m.provider === defaultProviderId)?.id || models[0]?.id || null
      : models[0]?.id || null;

    return {
      models,
      defaultModel,
    };
  }

  /**
   * Oturum bilgilerini doğrular ve gerekirse son kullanıcı mesajını kaydeder.
   */
  private async processSessionContext(
    conversationId: string,
    user_id: string,
    lastUserMessage?: ChatMessageDto
  ): Promise<SessionContext> {
    const session = await this.getSessionById(conversationId, user_id);

    if (lastUserMessage?.role === 'user') {
      await chatRepository.addMessage({
        conversation_id: conversationId,
        role: 'user',
        content: lastUserMessage.content,
      });
    }

    return {
      promptId: session.prompt_id?.toString(),
      customInstructions: session.custom_instructions,
      model: session.model,
    };
  }

  /**
   * Chat Oturumu ve İstek Parametrelerini Çözümleme Adaptörü
   */
  private async resolveSessionPrompt(
    dto: ChatRequestDto,
    userRoles?: string[],
    sessionContext?: SessionContext,
    ragContext?: string
  ): Promise<string | undefined> {
    const promptId = dto.promptId || sessionContext?.promptId;
    const customInstructions = dto.customInstructions || sessionContext?.customInstructions;

    return await promptService.buildSystemPrompt({
      ...(promptId ? { prompt_id: promptId } : {}),
      ...(customInstructions ? { custom_instructions: customInstructions } : {}),
      ...(userRoles ? { userRoles } : {}),
      ...(ragContext ? { ragContext } : {}),
    });
  }

  /**
   * Akış tamamlandığında asistan mesajını oturuma kaydeder.
   */
  private async persistAssistantMessage(
    conversationId: string,
    text: string
  ): Promise<void> {
    try {
      await chatRepository.addMessage({
        conversation_id: conversationId,
        role: 'assistant',
        content: text,
      });
    } catch (err) {
      console.error('[ChatService] Asistan mesajı kaydedilemedi:', err);
    }
  }

  private async resolveModelIdentifier(rawModel: string): Promise<string> {
    if (!rawModel.includes('/') && !aiProviderRegistry.getDefaultProviderId()) {
      const available = await aiProviderRegistry.getAvailableModels();
      const match = available.find(
        (m) =>
          m.name.toLowerCase() === rawModel.toLowerCase() ||
          m.id.toLowerCase() === rawModel.toLowerCase() ||
          m.id.toLowerCase().endsWith(`/${rawModel.toLowerCase()}`)
      );
      if (match) {
        return match.id.includes('/') ? match.id : `${match.provider}/${match.id}`;
      }
    }
    return rawModel;
  }

  private async fetchRagContext(
    dto: ChatRequestDto,
    user: { id: string; roles?: string[] | undefined; system_role?: string | undefined }
  ): Promise<{ citations: RagCitation[]; ragContext?: string }> {
    if (!dto.enableRag) {
      return { citations: [] };
    }

    const lastUserMessage = [...dto.messages].reverse().find((m) => m.role === 'user')?.content;
    if (!lastUserMessage || lastUserMessage.trim().length === 0) {
      return { citations: [] };
    }

    try {
      const userContext = {
        _id: user.id,
        roles: user.roles || [],
        system_role: user.system_role || 'user',
      };

      const queryInput = {
        query: lastUserMessage,
        limit: 5,
        score_threshold: dto.ragScoreThreshold ?? 0.5,
        ...(dto.ragDocumentIds && dto.ragDocumentIds.length > 0 ? { document_ids: dto.ragDocumentIds } : {}),
      };

      const ragResult = await ragService.queryKnowledge(queryInput, userContext as any);
      const citations = ragResult.citations;

      if (citations.length > 0) {
        const ragContext = citations
          .map((c, index) => {
            const docTitle = c.documentTitle ? ` - ${c.documentTitle}` : '';
            const pageInfo = c.pageNumber ? ` (Sayfa: ${c.pageNumber})` : '';
            const scorePercent = (c.score * 100).toFixed(1);
            return `[REFERANS ${index + 1}${docTitle}${pageInfo} | Güven: %${scorePercent}]\n${c.text}`;
          })
          .join('\n\n');

        return { citations, ragContext };
      }

      return { citations };
    } catch (ragError) {
      console.warn('[ChatService] RAG bilgi bankası sorgulanırken hata oluştu:', ragError);
      return { citations: [] };
    }
  }

  private validateChatInputs(dto: ChatRequestDto): void {
    if (dto.customInstructions) {
      promptGuard.assertSafe(dto.customInstructions);
    }
    const lastUserMsg = [...dto.messages].reverse().find((m) => m.role === 'user')?.content;
    if (lastUserMsg) {
      promptGuard.assertSafe(lastUserMsg);
    }
  }

  /**
   * Kullanıcı mesajlarını alır, opsiyonel RAG bilgi bankası aramasını yürütür,
   * Prompt Stacking ile sistem talimatını derler ve LLM üzerinden canlı akış başlatır.
   */
  async streamChat(
    dto: ChatRequestDto,
    user: { id: string; roles?: string[] | undefined; system_role?: string | undefined }
  ): Promise<StreamChatResult> {
    if (!user?.id) {
      throw new ValidationError('Sohbet akışı için geçerli bir kullanıcı kimliği zorunludur.');
    }

    // Girdi Güvenlik Denetimi: Doğrudan Prompt Injection, Jailbreak ve Sistem İfşası Taraması
    this.validateChatInputs(dto);

    let sessionContext: SessionContext | undefined;
    if (dto.conversationId) {
      const lastUserMessage = dto.messages.at(-1);
      sessionContext = await this.processSessionContext(dto.conversationId, user.id, lastUserMessage);
    }

    const requestedModel = dto.model || sessionContext?.model;
    if (!requestedModel) {
      throw new ValidationError('Sohbet için bir model belirtilmelidir.');
    }

    const selectedModel = await this.resolveModelIdentifier(requestedModel);
    const { citations, ragContext } = await this.fetchRagContext(dto, user);

    try {
      const model = getModel(selectedModel);
      const finalSystemPrompt = await this.resolveSessionPrompt(
        dto,
        user.roles,
        sessionContext,
        ragContext
      );

      const startTime = Date.now();
      const streamResult = streamText({
        model,
        messages: dto.messages,
        ...(finalSystemPrompt ? { system: finalSystemPrompt } : {}),
        ...(dto.temperature !== undefined ? { temperature: dto.temperature } : {}),
        onFinish: async (event) => {
          if (dto.conversationId && event.text) {
            await this.persistAssistantMessage(dto.conversationId, event.text);
          }

          const durationMs = Date.now() - startTime;
          const usage = event.usage as any;
          const promptTokens = usage?.promptTokens ?? usage?.prompt_tokens ?? 0;
          const completionTokens = usage?.completionTokens ?? usage?.completion_tokens ?? 0;
          const totalTokens = usage?.totalTokens ?? usage?.total_tokens ?? (promptTokens + completionTokens);
          const provider = selectedModel.includes('/') ? selectedModel.split('/')[0] : 'ollama';

          void telemetryService.recordLlmUsage({
            userId: (user as any)?._id?.toString(),
            conversationId: dto.conversationId,
            model: selectedModel,
            provider: provider || 'ollama',
            promptTokens,
            completionTokens,
            totalTokens,
            durationMs,
            status: 'success',
          });
        },
      });

      return {
        streamResult,
        citations,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message =
        error instanceof Error ? error.message : 'LLM servis sağlayıcısına ulaşılamadı.';
      throw new LLMProviderError(`Model akışı başlatılamadı: ${message}`, error);
    }
  }
}

export const chatService = new ChatService();
