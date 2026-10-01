import { streamText } from 'ai';
import { getModel } from '#modules/ai/index.js';
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
   * Kural 6: Oturumda statik prompt tutulmaz; persona referansı ve özel talimat saklanır.
   */
  async createSession(tenant_id: string, dto: CreateSessionDto) {
    return await chatRepository.createConversation({
      tenant_id,
      title: dto.title || 'Yeni Sohbet',
      model: dto.model,
      ...(dto.promptId ? { prompt_id: dto.promptId } : {}),
      ...(dto.customInstructions ? { custom_instructions: dto.customInstructions } : {}),
    });
  }

  /**
   * Tenant'a ait oturumları listeler.
   */
  async getSessions(tenant_id: string) {
    return await chatRepository.getConversations(tenant_id);
  }

  /**
   * Tekil oturum detayını getirir.
   */
  async getSessionById(id: string, tenant_id: string) {
    const session = await chatRepository.getConversationById(id, tenant_id);
    if (!session) {
      throw new NotFoundError(`Sohbet oturumu bulunamadı: ${id}`);
    }
    return session;
  }

  /**
   * Oturumu ve mesajlarını siler.
   */
  async deleteSession(id: string, tenant_id: string) {
    const deleted = await chatRepository.deleteConversation(id, tenant_id);
    if (!deleted) {
      throw new NotFoundError(`Silinecek sohbet oturumu bulunamadı: ${id}`);
    }
    return { success: true, message: 'Oturum başarıyla silindi.' };
  }

  /**
   * Oturuma ait mesaj geçmişini getirir.
   */
  async getSessionMessages(conversationId: string, tenant_id: string) {
    await this.getSessionById(conversationId, tenant_id);
    return await chatRepository.getMessagesByConversationId(conversationId, tenant_id);
  }

  /**
   * Oturum bilgilerini doğrular ve gerekirse son kullanıcı mesajını kaydeder.
   */
  private async processSessionContext(
    conversationId: string,
    tenant_id: string,
    lastUserMessage?: ChatMessageDto
  ): Promise<SessionContext> {
    const session = await this.getSessionById(conversationId, tenant_id);

    if (lastUserMessage?.role === 'user') {
      await chatRepository.addMessage({
        conversation_id: conversationId,
        tenant_id,
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
   * Çok Katmanlı Dinamik Prompt Oluşturma Motoru (Real-time Assembly)
   * 
   * [KURAL 6 UYUMLULUĞU]:
   * 1. Katman: Kurumsal Guardrail (Sistem seviyesinde aktif kurallar)
   * 2. Katman: Rol / Persona (prompt_id ile seçilen veya tenant varsayılan persona)
   * 3. Katman: Oturuma / Anlık mesaja özel talimat (custom_instructions)
   * 
   * Tüm bu katmanlar promptService üzerinden anlık derlenir; statik metin saklanmaz.
   */
  private async assembleSystemPrompt(
    dto: ChatRequestDto,
    tenant_id: string,
    sessionContext?: SessionContext
  ): Promise<string | undefined> {
    const promptId = dto.promptId || sessionContext?.promptId;
    const customInstructions = dto.customInstructions || sessionContext?.customInstructions;

    return await promptService.buildSystemPrompt(tenant_id, {
      ...(promptId ? { prompt_id: promptId } : {}),
      ...(customInstructions ? { custom_instructions: customInstructions } : {}),
    });
  }

  /**
   * Akış tamamlandığında asistan mesajını oturuma kaydeder.
   */
  private async persistAssistantMessage(
    conversationId: string,
    tenant_id: string,
    text: string
  ): Promise<void> {
    try {
      await chatRepository.addMessage({
        conversation_id: conversationId,
        tenant_id,
        role: 'assistant',
        content: text,
      });
    } catch (err) {
      console.error('[ChatService] Asistan mesajı kaydedilemedi:', err);
    }
  }

  /**
   * Kullanıcı mesajlarını alır, opsiyonel olarak DB'ye kaydeder ve LLM üzerinden canlı akış başlatır.
   * Model parametresi oturumdan veya istek gövdesinden gelmek zorundadır.
   * Sistem promptları gerçek zamanlı birleştirme motoru (Prompt Stacking Engine) ile derlenir.
   */
  async streamChat(dto: ChatRequestDto, tenant_id = 'default-tenant') {
    let sessionContext: SessionContext | undefined;

    if (dto.conversationId) {
      const lastUserMessage = dto.messages[dto.messages.length - 1];
      sessionContext = await this.processSessionContext(dto.conversationId, tenant_id, lastUserMessage);
    }

    const selectedModel = dto.model || sessionContext?.model;
    if (!selectedModel) {
      throw new ValidationError('Sohbet için bir model belirtilmelidir.');
    }

    try {
      const model = getModel(selectedModel);
      const finalSystemPrompt = await this.assembleSystemPrompt(dto, tenant_id, sessionContext);

      return streamText({
        model,
        messages: dto.messages,
        ...(finalSystemPrompt ? { system: finalSystemPrompt } : {}),
        ...(dto.temperature !== undefined ? { temperature: dto.temperature } : {}),
        onFinish: async (event) => {
          if (dto.conversationId && event.text) {
            await this.persistAssistantMessage(dto.conversationId, tenant_id, event.text);
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
