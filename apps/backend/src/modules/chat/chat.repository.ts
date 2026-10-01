import { Types } from 'mongoose';
import { ConversationModel, type IConversation } from '#modules/chat/conversation.model.js';
import { MessageModel, type IMessage } from '#modules/chat/message.model.js';

export class ChatRepository {
  /**
   * Yeni bir sohbet oturumu oluşturur.
   */
  async createConversation(data: {
    tenant_id: string;
    title?: string;
    model?: string;
    system_prompt?: string;
  }): Promise<IConversation> {
    return await ConversationModel.create(data);
  }

  /**
   * Bir tenant'a ait tüm sohbet oturumlarını en yeniden eskiye listeler.
   */
  async getConversations(tenant_id: string): Promise<IConversation[]> {
    return await ConversationModel.find({ tenant_id }).sort({ updated_at: -1 }).exec();
  }

  /**
   * Belirtilen ID ve tenant'a ait tekil oturumu getirir.
   */
  async getConversationById(id: string, tenant_id: string): Promise<IConversation | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await ConversationModel.findOne({ _id: id, tenant_id }).exec();
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
