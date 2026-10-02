/**
 * @file user.model.ts
 * @description Kurumsal Kullanıcı Veri Modeli.
 * Tek kurum (On-Prem) mimarisine uygun olarak SaaS tenant bağımlılığından arındırılmıştır.
 * Çift katmanlı yetkilendirme içerir:
 * 1. system_role: Sistem seviyesi yetki ('superadmin', 'admin', 'user').
 *    - Sistemde yalnızca TEK BİR 'superadmin' bulunabilir (Partial Unique Index ile garanti edilir).
 * 2. roles: Kurum içi fonksiyonel departman/erişim rolleri (örn: ['hr'], ['developer'], ['finance']).
 */

import mongoose, { Schema, type Model } from 'mongoose';

export type SystemRole = 'superadmin' | 'admin' | 'user';

export interface IUser {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  system_role: SystemRole;
  roles: string[];
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

const userSchema = new Schema<IUser>(
  {
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
    system_role: {
      type: String,
      enum: ['superadmin', 'admin', 'user'],
      default: 'user',
      index: true,
    },
    roles: {
      type: [String],
      default: [],
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

/**
 * GÜVENLİK KRİTERİ:
 * Sistemde yalnızca TEK BİR 'superadmin' bulunabilmesini veritabanı seviyesinde
 * kesin olarak garanti eden Partial Unique Index.
 */
userSchema.index(
  { system_role: 1 },
  {
    unique: true,
    partialFilterExpression: { system_role: 'superadmin' },
  }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
