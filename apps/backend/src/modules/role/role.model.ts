/**
 * @file role.model.ts
 * @description Kurumsal Rol ve Yetki Şeması.
 * Dinamik olarak yeni roller eklenebilir, izinleri genişletilebilir.
 * İki ana arketip ('admin' veya 'user') üzerinden tavan yetki havuzu sınırlandırılır.
 */

import mongoose, { Schema, type Model } from 'mongoose';
import type { RoleArchetype } from '#modules/role/role.types.js';

export interface IRole {
  slug: string;
  name: string;
  description?: string;
  base_archetype: RoleArchetype;
  permissions: string[];
  is_default: boolean;
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
    base_archetype: {
      type: String,
      enum: ['admin', 'user'],
      required: [true, 'Rol arketipi zorunludur.'],
      default: 'user',
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    is_default: {
      type: Boolean,
      default: false,
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

/**
 * GÜVENLİK VE TUTARLILIK KRİTERİ:
 * Sistemde 'user' arketipine ait yalnızca TEK BİR varsayılan (default) rol bulunabilir.
 */
roleSchema.index(
  { is_default: 1 },
  {
    unique: true,
    partialFilterExpression: { is_default: true },
  }
);

export const RoleModel: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>('Role', roleSchema);
