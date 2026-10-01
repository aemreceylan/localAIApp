import { Types } from 'mongoose';
import { PromptModel, type IPrompt, type PromptType } from '@/modules/prompt/prompt.model.js';

export class PromptRepository {
  async createPrompt(data: {
    tenant_id: string;
    title: string;
    slug: string;
    type: PromptType;
    content: string;
    is_active?: boolean;
    is_default?: boolean;
    priority?: number;
  }): Promise<IPrompt> {
    return await PromptModel.create(data);
  }

  async getPrompts(
    tenant_id: string,
    filter?: { type?: PromptType; is_active?: boolean }
  ): Promise<IPrompt[]> {
    const query: Record<string, unknown> = { tenant_id };
    if (filter?.type) query.type = filter.type;
    if (filter?.is_active !== undefined) query.is_active = filter.is_active;

    return await PromptModel.find(query).sort({ priority: 1, created_at: -1 }).exec();
  }

  async getPromptById(id: string, tenant_id: string): Promise<IPrompt | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await PromptModel.findOne({ _id: id, tenant_id }).exec();
  }

  async getPromptBySlug(slug: string, tenant_id: string): Promise<IPrompt | null> {
    return await PromptModel.findOne({ slug, tenant_id }).exec();
  }

  /**
   * Tenant'a ait tüm aktif güvenlik (Guardrail) prompt'larını öncelik sırasına göre getirir.
   */
  async getActiveGuardrails(tenant_id: string): Promise<IPrompt[]> {
    return await PromptModel.find({
      tenant_id,
      type: 'system_guardrail',
      is_active: true,
    })
      .sort({ priority: 1 })
      .exec();
  }

  /**
   * Tenant için varsayılan olarak belirlenmiş persona prompt'unu getirir.
   */
  async getDefaultPersona(tenant_id: string): Promise<IPrompt | null> {
    return await PromptModel.findOne({
      tenant_id,
      type: 'persona',
      is_default: true,
      is_active: true,
    }).exec();
  }

  async updatePrompt(
    id: string,
    tenant_id: string,
    data: Partial<IPrompt>
  ): Promise<IPrompt | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await PromptModel.findOneAndUpdate(
      { _id: id, tenant_id },
      data,
      { returnDocument: 'after' }
    ).exec();
  }

  async deletePrompt(id: string, tenant_id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const deleted = await PromptModel.findOneAndDelete({ _id: id, tenant_id }).exec();
    return !!deleted;
  }
}

export const promptRepository = new PromptRepository();
