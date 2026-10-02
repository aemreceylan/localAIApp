import { Types } from 'mongoose';
import { ConversationModel, type IConversation } from '#modules/chat/conversation.model.js';
import { MessageModel, type IMessage } from '#modules/chat/message.model.js';

export class ChatRepository {
  async createConversation(data: {
    user_id?: string;
    model: string;
    title?: string;
    prompt_id?: string;
    custom_instructions?: string;
  }): Promise<IConversation> {
    return await ConversationModel.create(data);
  }

  async getConversations(user_id?: string): Promise<IConversation[]> {
    const filter: Record<string, unknown> = {};
    if (user_id) {
      filter.user_id = user_id;
    }
    return await ConversationModel.find(filter).sort({ updated_at: -1 }).exec();
  }

  async getConversationById(
    id: string,
    user_id?: string
  ): Promise<IConversation | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const filter: Record<string, unknown> = { _id: id };
    if (user_id) {
      filter.user_id = user_id;
    }
    return await ConversationModel.findOne(filter).exec();
  }

  async updateConversationTitle(
    id: string,
    title: string,
    user_id?: string
  ): Promise<IConversation | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const filter: Record<string, unknown> = { _id: id };
    if (user_id) {
      filter.user_id = user_id;
    }
    return await ConversationModel.findOneAndUpdate(
      filter,
      { title },
      { returnDocument: 'after' }
    ).exec();
  }

  async deleteConversation(id: string, user_id?: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const filter: Record<string, unknown> = { _id: id };
    if (user_id) {
      filter.user_id = user_id;
    }
    const deleted = await ConversationModel.findOneAndDelete(filter).exec();
    if (deleted) {
      await MessageModel.deleteMany({ conversation_id: id }).exec();
      return true;
    }
    return false;
  }

  async addMessage(data: {
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }): Promise<IMessage> {
    const message = await MessageModel.create({
      ...data,
      conversation_id: new Types.ObjectId(data.conversation_id),
    });

    // Oturumun updated_at zamanını güncelle
    await ConversationModel.updateOne(
      { _id: data.conversation_id },
      { updated_at: new Date() }
    ).exec();

    return message;
  }

  async getMessagesByConversationId(
    conversation_id: string
  ): Promise<IMessage[]> {
    if (!Types.ObjectId.isValid(conversation_id)) return [];
    return await MessageModel.find({ conversation_id }).sort({ created_at: 1 }).exec();
  }
}

export const chatRepository = new ChatRepository();
