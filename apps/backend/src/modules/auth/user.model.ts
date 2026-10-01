/**
 * @file user.model.ts
 * @description Kullanıcı veri modeli.
 * Esnek RBAC, multi-tenant bağlamı ve şifrelenmiş kimlik bilgileri içerir.
 * @design-token documents/common/data_and_business_workflows.md satır 51-62
 */

import mongoose, { Schema, type Model } from 'mongoose';

export type UserRole = 'superadmin' | 'tenant_admin' | 'user';

export interface IUser {
  tenant_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

const userSchema = new Schema<IUser>(
  {
    tenant_id: {
      type: String,
      required: [true, 'tenant_id zorunludur.'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'E-posta adresi zorunludur.'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password_hash: {
      type: String,
      required: [true, 'Parola hash zorunludur.'],
    },
    first_name: {
      type: String,
      required: [true, 'Ad zorunludur.'],
      trim: true,
      maxlength: [50, 'Ad 50 karakterden uzun olamaz.'],
    },
    last_name: {
      type: String,
      required: [true, 'Soyad zorunludur.'],
      trim: true,
      maxlength: [50, 'Soyad 50 karakterden uzun olamaz.'],
    },
    role: {
      type: String,
      enum: ['superadmin', 'tenant_admin', 'user'],
      default: 'user',
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'users',
  }
);

// Hızlı arama için bileşik indeks
userSchema.index({ tenant_id: 1, email: 1 });

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
