/**
 * @file role.model.ts
 * @description Kurumsal Rol ve Yetki Şeması.
 * Dinamik olarak yeni roller eklenebilir, yetkileri genişletilebilir.
 */

import mongoose, { Schema, type Model } from 'mongoose';

export interface IRole {
  slug: string;
  name: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
  created_at?: Date;
  updated_at?: Date;
}

const roleSchema = new Schema<IRole>(
  {
    slug: {
      type: String,
      required: [true, 'Rol slug değeri zorunludur.'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Rol adı zorunludur.'],
      trim: true,
      maxlength: [100, 'Rol adı 100 karakterden uzun olamaz.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    permissions: {
      type: [String],
      default: [],
    },
    is_system: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'roles',
  }
);

export const RoleModel: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>('Role', roleSchema);
