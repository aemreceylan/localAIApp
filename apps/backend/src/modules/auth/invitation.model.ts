/**
 * @file invitation.model.ts
 * @description Kurumsal Davet Kodu Veri Modeli.
 * Adminlerin süreli ve sınırlı kullanıma sahip kayıt davetiyeleri üretmesini sağlar.
 */

import mongoose, { Schema, type Model, type Document } from 'mongoose';

export interface IInvitation extends Document {
  code: string;
  assigned_roles: string[];
  max_uses: number;
  used_count: number;
  expires_at: Date;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    code: {
      type: String,
      required: [true, 'Davet kodu zorunludur.'],
      unique: true,
      trim: true,
      index: true,
    },
    assigned_roles: {
      type: [String],
      default: [],
    },
    max_uses: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Maksimum kullanım sayısı en az 1 olmalıdır.'],
    },
    used_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    expires_at: {
      type: Date,
      required: [true, 'Son geçerlilik tarihi zorunludur.'],
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Oluşturan yönetici zorunludur.'],
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'invitations',
  }
);

invitationSchema.index({ code: 1, expires_at: 1 });

export const InvitationModel: Model<IInvitation> =
  mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', invitationSchema);
