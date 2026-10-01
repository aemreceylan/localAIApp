import mongoose, { Schema, type Model } from 'mongoose';

export type PromptType = 'system_guardrail' | 'persona' | 'custom';

export interface IPrompt {
  tenant_id: string;
  title: string;
  slug: string;
  type: PromptType;
  content: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  created_at?: Date;
  updated_at?: Date;
}

const promptSchema = new Schema<IPrompt>(
  {
    tenant_id: {
      type: String,
      required: [true, 'tenant_id zorunludur.'],
      index: true,
    },
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

// Tenant bazlı bileşik indeksler
promptSchema.index({ tenant_id: 1, slug: 1 }, { unique: true });
promptSchema.index({ tenant_id: 1, type: 1, is_active: 1 });

export const PromptModel: Model<IPrompt> =
  mongoose.models.Prompt || mongoose.model<IPrompt>('Prompt', promptSchema);
