import mongoose, { Schema, type Model } from 'mongoose';

export interface IConversation {
  tenant_id: string;
  title: string;
  model: string;
  prompt_id?: mongoose.Types.ObjectId | string;
  custom_instructions?: string;
  system_prompt?: string;
  created_at?: Date;
  updated_at?: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    tenant_id: {
      type: String,
      required: [true, 'tenant_id zorunludur.'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Sohbet başlığı zorunludur.'],
      trim: true,
      maxlength: [200, 'Başlık 200 karakterden uzun olamaz.'],
      default: 'Yeni Sohbet',
    },
    model: {
      type: String,
      required: [true, 'Model adı zorunludur.'],
    },
    prompt_id: {
      type: Schema.Types.ObjectId,
      ref: 'Prompt',
      required: false,
    },
    custom_instructions: {
      type: String,
      trim: true,
      maxlength: [2000, 'Özel talimatlar 2000 karakterden uzun olamaz.'],
    },
    system_prompt: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Çoklu kiracı (Tenant) bazlı indeksleme
conversationSchema.index({ tenant_id: 1, updated_at: -1 });

export const ConversationModel: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', conversationSchema);
