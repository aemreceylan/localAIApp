import mongoose, { Schema, type Model } from 'mongoose';

export type PromptType = 'system_guardrail' | 'persona' | 'custom';

export interface IPrompt {
  title: string;
  slug: string;
  type: PromptType;
  content: string;
  allowed_roles: string[]; // Erişebilecek roller, örn: ['*'] (herkes) veya ['hr', 'developer']
  is_active: boolean;
  is_default: boolean;
  priority: number;
  created_at?: Date;
  updated_at?: Date;
}

const promptSchema = new Schema<IPrompt>(
  {
    title: {
      type: String,
      required: [true, 'Prompt başlığı zorunludur.'],
      trim: true,
      maxlength: [150, 'Başlık 150 karakterden uzun olamaz.'],
    },
    slug: {
      type: String,
      required: [true, 'Prompt slug değeri zorunludur.'],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['system_guardrail', 'persona', 'custom'],
      required: [true, 'Prompt tipi zorunludur.'],
      default: 'persona',
    },
    content: {
      type: String,
      required: [true, 'Prompt içeriği boş olamaz.'],
    },
    allowed_roles: {
      type: [String],
      default: ['*'], // Varsayılan olarak tüm rollere açık
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

promptSchema.index({ type: 1, is_active: 1 });

export const PromptModel: Model<IPrompt> =
  mongoose.models.Prompt || mongoose.model<IPrompt>('Prompt', promptSchema);
