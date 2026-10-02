import mongoose, { Schema, type Model } from 'mongoose';

/**
 * ============================================================================
 * VERİ MODELİ: Conversation (Sohbet Oturumu)
 * ============================================================================
 * 
 * [MİMARİ GEREKÇE & KURAL 6 UYUMLULUĞU]:
 * Platformumuzda sistem promptları oturum içine statik metin olarak gömülemez.
 * Bunun yerine oturum;
 * 1. Hangi LLM modeliyle çalıştığını (`model`),
 * 2. Hangi Persona'ya bağlı olduğunu (`prompt_id` referansı ile `prompts` koleksiyonu),
 * 3. Kullanıcının oturuma özel ek talimatlarını (`custom_instructions`)
 * saklar.
 */
export interface IConversation {
  user_id?: mongoose.Types.ObjectId | string;
  title: string;
  model: string;
  prompt_id?: mongoose.Types.ObjectId | string;
  custom_instructions?: string;
  created_at?: Date;
  updated_at?: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
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
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Kullanıcı bazlı kronolojik indeksleme
conversationSchema.index({ user_id: 1, updated_at: -1 });

export const ConversationModel: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', conversationSchema);
