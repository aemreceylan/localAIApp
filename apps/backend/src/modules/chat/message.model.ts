import mongoose, { Schema, type Model, Types } from 'mongoose';

export interface IMessage {
  _id?: Types.ObjectId | string;
  conversation_id: Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'conversation_id zorunludur.'],
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: [true, 'Mesaj rolü zorunludur.'],
    },
    content: {
      type: String,
      required: [true, 'Mesaj içeriği boş olamaz.'],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Oturum mesajlarını sıralı çekmek için bileşik indeks
messageSchema.index({ conversation_id: 1, created_at: 1 });

export const MessageModel: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);
