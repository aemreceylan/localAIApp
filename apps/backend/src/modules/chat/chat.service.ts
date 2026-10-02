import { streamText } from 'ai';
import { getModel, aiProviderRegistry } from '#modules/ai/index.js';
import { LLMProviderError, NotFoundError, ValidationError } from '#shared/errors/index.js';
import { chatRepository } from '#modules/chat/chat.repository.js';
import { promptService } from '#modules/prompt/index.js';
import type { ChatMessageDto, ChatRequestDto, CreateSessionDto } from '#modules/chat/chat.dto.js';

interface SessionContext {
  promptId: string | undefined;
  customInstructions: string | undefined;
  model: string | undefined;
}

export class ChatService {
  /**
   * Yeni bir sohbet oturumu oluşturur. Model seçimi zorunludur.
   */
  async createSession(dto: CreateSessionDto, user_id?: string) {
    return await chatRepository.createConversation({
      ...(user_id ? { user_id } : {}),
      title: dto.title || 'Yeni Sohbet',
      model: dto.model,
      ...(dto.promptId ? { prompt_id: dto.promptId } : {}),
      ...(dto.customInstructions ? { custom_instructions: dto.customInstructions } : {}),
    });
  }

  /**
   * Kullanıcıya ait oturumları listeler.
   */
  async getSessions(user_id?: string) {
    return await chatRepository.getConversations(user_id);
  }

  /**
   * Tekil oturum detayını getirir.
   */
  async getSessionById(id: string, user_id?: string) {
    const session = await chatRepository.getConversationById(id, user_id);
    if (!session) {
      throw new NotFoundError(`Sohbet oturumu bulunamadı: ${id}`);
    }
    return session;
  }

  /**
   * Oturumu ve mesajlarını siler.
   */
  async deleteSession(id: string, user_id?: string) {
    const deleted = await chatRepository.deleteConversation(id, user_id);
    if (!deleted) {
      throw new NotFoundError(`Silinecek sohbet oturumu bulunamadı: ${id}`);
    }
    return { success: true, message: 'Oturum başarıyla silindi.' };
  }

  /**
   * Oturuma ait mesaj geçmişini getirir.
   */
  async getSessionMessages(conversationId: string, user_id?: string) {
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
    user_id?: string,
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
    sessionContext?: SessionContext
  ): Promise<string | undefined> {
    const promptId = dto.promptId || sessionContext?.promptId;
    const customInstructions = dto.customInstructions || sessionContext?.customInstructions;

    return await promptService.buildSystemPrompt({
      ...(promptId ? { prompt_id: promptId } : {}),
      ...(customInstructions ? { custom_instructions: customInstructions } : {}),
      ...(userRoles ? { userRoles } : {}),
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

  /**
   * Kullanıcı mesajlarını alır, opsiyonel olarak DB'ye kaydeder ve LLM üzerinden canlı akış başlatır.
   */
  async streamChat(
    dto: ChatRequestDto,
    user?: { id?: string | undefined; roles?: string[] | undefined } | undefined
  ) {
    let sessionContext: SessionContext | undefined;

    if (dto.conversationId) {
      const lastUserMessage = dto.messages.at(-1);
      sessionContext = await this.processSessionContext(dto.conversationId, user?.id, lastUserMessage);
    }

    let selectedModel = dto.model || sessionContext?.model;
    if (!selectedModel) {
      throw new ValidationError('Sohbet için bir model belirtilmelidir.');
    }

    // Model tanımlayıcısı sağlayıcı ön eki ('provider/model') içermiyorsa dinamik eşleştir
    const rawModelName = selectedModel;
    if (!rawModelName.includes('/') && !aiProviderRegistry.getDefaultProviderId()) {
      const available = await aiProviderRegistry.getAvailableModels();
      const match = available.find(
        (m) =>
          m.name.toLowerCase() === rawModelName.toLowerCase() ||
          m.id.toLowerCase() === rawModelName.toLowerCase() ||
          m.id.toLowerCase().endsWith(`/${rawModelName.toLowerCase()}`)
      );
      if (match) {
        selectedModel = match.id.includes('/') ? match.id : `${match.provider}/${match.id}`;
      }
    }

    try {
      const model = getModel(selectedModel);
      const finalSystemPrompt = await this.resolveSessionPrompt(dto, user?.roles, sessionContext);

      return streamText({
        model,
        messages: dto.messages,
        ...(finalSystemPrompt ? { system: finalSystemPrompt } : {}),
        ...(dto.temperature !== undefined ? { temperature: dto.temperature } : {}),
        onFinish: async (event) => {
          if (dto.conversationId && event.text) {
            await this.persistAssistantMessage(dto.conversationId, event.text);
          }
        },
      });
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      const message =
        error instanceof Error ? error.message : 'LLM servis sağlayıcısına ulaşılamadı.';
      throw new LLMProviderError(`Model akışı başlatılamadı: ${message}`, error);
    }
  }
}

export const chatService = new ChatService();
