import { Types } from 'mongoose';
import { ConversationModel, type IConversation } from '#modules/chat/conversation.model.js';
import { MessageModel, type IMessage } from '#modules/chat/message.model.js';

export class ChatRepository {
  /**
   * ============================================================================
   * TASARIM DESENİ: Repository (Veri Erişim Katmanı)
   * ============================================================================
   * Yeni bir sohbet oturumu oluşturur ve veritabanına kaydeder.
   * 
   * [KURAL 6 UYUMLULUĞU]:
   * Oturumda statik sistem promptu saklanmaz; yalnızca model, persona referansı
   * (`prompt_id`) ve oturuma özel kullanıcı ek talimatı (`custom_instructions`) tutulur.
   * 
   * @param {Object} data - Oturum oluşturma parametreleri
   * @param {string} data.tenant_id - Kiracı kimliği (RLS İzolasyonu)
   * @param {string} data.model - Zorunlu seçilen LLM adı
   * @param {string} [data.title] - Sohbet başlığı (varsayılan: 'Yeni Sohbet')
   * @param {string} [data.prompt_id] - Oturumun bağlı olduğu dinamik persona ID'si
   * @param {string} [data.custom_instructions] - Oturuma özel kullanıcı ek talimatı
   * @returns {Promise<IConversation>} Oluşturulan oturum dokümanı
   */
  async createConversation(data: {
    tenant_id: string;
    user_id?: string;
    model: string;
    title?: string;
    prompt_id?: string;
    custom_instructions?: string;
  }): Promise<IConversation> {
    return await ConversationModel.create(data);
  }

  /**
   * Bir tenant'a (ve opsiyonel olarak kullanıcıya) ait tüm sohbet oturumlarını en yeniden eskiye listeler.
   */
  async getConversations(tenant_id: string, user_id?: string): Promise<IConversation[]> {
    const filter: Record<string, unknown> = { tenant_id };
    if (user_id) {
      filter.user_id = user_id;
    }
    return await ConversationModel.find(filter).sort({ updated_at: -1 }).exec();
  }

  /**
   * Belirtilen ID, tenant ve opsiyonel kullanıcıya ait tekil oturumu getirir.
   */
  async getConversationById(
    id: string,
    tenant_id: string,
    user_id?: string
  ): Promise<IConversation | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const filter: Record<string, unknown> = { _id: id, tenant_id };
    if (user_id) {
      filter.user_id = user_id;
    }
    return await ConversationModel.findOne(filter).exec();
  }

  /**
   * Oturum başlığını günceller.
   */
  async updateConversationTitle(
    id: string,
    tenant_id: string,
    title: string
  ): Promise<IConversation | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await ConversationModel.findOneAndUpdate(
      { _id: id, tenant_id },
      { title },
      { returnDocument: 'after' }
    ).exec();
  }

  /**
   * Oturumu ve o oturuma ait tüm mesajları veritabanından temizler.
   */
  async deleteConversation(id: string, tenant_id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const deleted = await ConversationModel.findOneAndDelete({ _id: id, tenant_id }).exec();
    if (deleted) {
      await MessageModel.deleteMany({ conversation_id: id, tenant_id }).exec();
      return true;
    }
    return false;
  }

  /**
   * Oturuma yeni bir mesaj ekler ve oturumun updated_at zamanını günceller.
   */
  async addMessage(data: {
    conversation_id: string;
    tenant_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }): Promise<IMessage> {
    const message = await MessageModel.create({
      ...data,
      conversation_id: new Types.ObjectId(data.conversation_id),
    });

    // Oturumun updated_at zamanını güncelle
    await ConversationModel.updateOne(
      { _id: data.conversation_id, tenant_id: data.tenant_id },
      { updated_at: new Date() }
    ).exec();

    return message;
  }

  /**
   * Belirtilen oturuma ait tüm mesajları kronolojik sırayla getirir.
   */
  async getMessagesByConversationId(
    conversation_id: string,
    tenant_id: string
  ): Promise<IMessage[]> {
    if (!Types.ObjectId.isValid(conversation_id)) return [];
    return await MessageModel.find({ conversation_id, tenant_id }).sort({ created_at: 1 }).exec();
  }
}

export const chatRepository = new ChatRepository();
