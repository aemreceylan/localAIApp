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

  async getConversations(user_id: string): Promise<IConversation[]> {
    if (!user_id || !Types.ObjectId.isValid(user_id)) return [];
    return await ConversationModel.find({ user_id }).sort({ updated_at: -1 }).lean<IConversation[]>().exec();
  }

  async getConversationById(
    id: string,
    user_id: string
  ): Promise<IConversation | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(user_id)) return null;
    return await ConversationModel.findOne({ _id: id, user_id }).lean<IConversation>().exec();
  }

  async updateConversationTitle(
    id: string,
    title: string,
    user_id: string
  ): Promise<IConversation | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(user_id)) return null;
    return await ConversationModel.findOneAndUpdate(
      { _id: id, user_id },
      { title },
      { returnDocument: 'after' }
    ).lean<IConversation>().exec();
  }

  async deleteConversation(id: string, user_id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(user_id)) return false;
    const deleted = await ConversationModel.findOneAndDelete({ _id: id, user_id }).exec();
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
    return await MessageModel.find({ conversation_id }).sort({ created_at: 1 }).lean<IMessage[]>().exec();
  }
}

export const chatRepository = new ChatRepository();
