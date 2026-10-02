import { Types } from 'mongoose';
import { PromptModel, type IPrompt, type PromptType } from '#modules/prompt/prompt.model.js';

export class PromptRepository {
  async createPrompt(data: {
    title: string;
    slug: string;
    type: PromptType;
    content: string;
    allowed_roles?: string[];
    is_active?: boolean;
    is_default?: boolean;
    priority?: number;
  }): Promise<IPrompt> {
    return await PromptModel.create({
      ...data,
      allowed_roles: data.allowed_roles && data.allowed_roles.length > 0 ? data.allowed_roles : ['*'],
    });
  }

  async getPrompts(filter?: {
    type?: PromptType;
    is_active?: boolean;
    roles?: string[];
  }): Promise<IPrompt[]> {
    const query: Record<string, unknown> = {};
    if (filter?.type) query.type = filter.type;
    if (filter?.is_active !== undefined) query.is_active = filter.is_active;

    if (filter?.roles && filter.roles.length > 0) {
      query.allowed_roles = { $in: [...filter.roles, '*'] };
    }

    return await PromptModel.find(query).sort({ priority: 1, created_at: -1 }).exec();
  }

  async getPromptById(id: string): Promise<IPrompt | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await PromptModel.findById(id).exec();
  }

  async getPromptBySlug(slug: string): Promise<IPrompt | null> {
    return await PromptModel.findOne({ slug }).exec();
  }

  /**
   * Tüm aktif güvenlik (Guardrail) prompt'larını öncelik sırasına göre getirir.
   */
  async getActiveGuardrails(roles?: string[]): Promise<IPrompt[]> {
    const query: Record<string, unknown> = {
      type: 'system_guardrail',
      is_active: true,
    };

    if (roles && roles.length > 0) {
      query.allowed_roles = { $in: [...roles, '*'] };
    }

    return await PromptModel.find(query).sort({ priority: 1 }).exec();
  }

  /**
   * Varsayılan olarak belirlenmiş persona prompt'unu getirir.
   */
  async getDefaultPersona(roles?: string[]): Promise<IPrompt | null> {
    const query: Record<string, unknown> = {
      type: 'persona',
      is_default: true,
      is_active: true,
    };

    if (roles && roles.length > 0) {
      query.allowed_roles = { $in: [...roles, '*'] };
    }

    return await PromptModel.findOne(query).exec();
  }

  async updatePrompt(id: string, data: Partial<IPrompt>): Promise<IPrompt | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await PromptModel.findByIdAndUpdate(
      id,
      data,
      { returnDocument: 'after' }
    ).exec();
  }

  async deletePrompt(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const deleted = await PromptModel.findByIdAndDelete(id).exec();
    return !!deleted;
  }
}

export const promptRepository = new PromptRepository();
