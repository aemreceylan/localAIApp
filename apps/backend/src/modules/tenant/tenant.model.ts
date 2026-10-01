/**
 * @file tenant.model.ts
 * @description Kiracı (Tenant / Organizasyon) veri modeli.
 * Kurumsal veri izolasyonu (Row-Level Security - RLS) için her verinin bağlı olduğu ana organizasyonel birim.
 * @design-token documents/common/data_and_business_workflows.md satır 41-49
 */

import mongoose, { Schema, type Model } from 'mongoose';

export interface ITenant {
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  settings?: {
    allowedModels?: string[];
    defaultModel?: string;
    tokenQuotaMonthly?: number;
  };
  created_at?: Date;
  updated_at?: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: {
      type: String,
      required: [true, 'Kurum/Kiracı adı zorunludur.'],
      trim: true,
      maxlength: [100, 'Kurum adı 100 karakterden uzun olamaz.'],
    },
    slug: {
      type: String,
      required: [true, 'Tenant slug zorunludur.'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
      index: true,
    },
    settings: {
      allowedModels: [{ type: String }],
      defaultModel: { type: String },
      tokenQuotaMonthly: { type: Number, default: 0 },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'tenants',
  }
);

export const TenantModel: Model<ITenant> =
  mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', tenantSchema);
