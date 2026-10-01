import { promptRepository } from '#modules/prompt/prompt.repository.js';
import type { CreatePromptDto, UpdatePromptDto } from '#modules/prompt/prompt.dto.js';
import { NotFoundError, DomainError } from '#shared/errors/index.js';

export class PromptService {
  async createPrompt(tenant_id: string, dto: CreatePromptDto) {
    const existing = await promptRepository.getPromptBySlug(dto.slug, tenant_id);
    if (existing) {
      throw new DomainError(`'${dto.slug}' slug değerine sahip bir prompt zaten mevcut.`);
    }

    return await promptRepository.createPrompt({
      tenant_id,
      title: dto.title,
      slug: dto.slug,
      type: dto.type,
      content: dto.content,
      ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
      ...(dto.isDefault !== undefined ? { is_default: dto.isDefault } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
    });
  }

  async getPrompts(tenant_id: string, filter?: { type?: string; is_active?: boolean }) {
    return await promptRepository.getPrompts(tenant_id, filter as any);
  }

  async getPromptById(id: string, tenant_id: string) {
    const prompt = await promptRepository.getPromptById(id, tenant_id);
    if (!prompt) {
      throw new NotFoundError(`Prompt bulunamadı: ${id}`);
    }
    return prompt;
  }

  async updatePrompt(id: string, tenant_id: string, dto: UpdatePromptDto) {
    await this.getPromptById(id, tenant_id);

    const updated = await promptRepository.updatePrompt(id, tenant_id, {
      ...(dto.title ? { title: dto.title } : {}),
      ...(dto.slug ? { slug: dto.slug } : {}),
      ...(dto.type ? { type: dto.type } : {}),
      ...(dto.content ? { content: dto.content } : {}),
      ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
      ...(dto.isDefault !== undefined ? { is_default: dto.isDefault } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
    });

    return updated!;
  }

  async deletePrompt(id: string, tenant_id: string) {
    const deleted = await promptRepository.deletePrompt(id, tenant_id);
    if (!deleted) {
      throw new NotFoundError(`Silinecek prompt bulunamadı: ${id}`);
    }
    return { success: true, message: 'Prompt başarıyla silindi.' };
  }

  /**
   * ÇOK KATMANLI ANLIK DİNAMİK PROMPT OLUŞTURMA MOTORU (Prompt Stacking Engine)
   * 
   * 1. Katman: Kurumsal Güvenlik & Guardrails (Zorunlu)
   * 2. Katman: Rol / Persona (Seçilen veya varsayılan uzmanlık)
   * 3. Katman: Kullanıcı Özel Talimatı (Opsiyonel)
   */
  async buildSystemPrompt(
    tenant_id: string,
    options: {
      prompt_id?: string;
      custom_instructions?: string;
    } = {}
  ): Promise<string | undefined> {
    const sections: string[] = [];

    // 1. Katman: Aktif Kurumsal Guardrail Prompt'ları (Anlık DB sorgusu)
    const guardrails = await promptRepository.getActiveGuardrails(tenant_id);
    if (guardrails.length > 0) {
      const guardrailText = guardrails.map((g) => `- ${g.content}`).join('\n');
      sections.push(`=== [KURUMSAL GÜVENLİK VE POLİTİKA KURALLARI] ===\n${guardrailText}`);
    }

    // 2. Katman: Rol / Persona Prompt'u (Anlık DB sorgusu)
    let personaPrompt = '';
    if (options.prompt_id) {
      const persona = await promptRepository.getPromptById(options.prompt_id, tenant_id);
      if (persona?.is_active) {
        personaPrompt = persona.content;
      }
    } else {
      const defaultPersona = await promptRepository.getDefaultPersona(tenant_id);
      if (defaultPersona) {
        personaPrompt = defaultPersona.content;
      }
    }

    if (personaPrompt) {
      sections.push(`=== [UZMANLIK VE ROL TALİMATI] ===\n${personaPrompt}`);
    }

    // 3. Katman: Kullanıcı Özel Talimatı (Opsiyonel)
    if (options.custom_instructions && options.custom_instructions.trim() !== '') {
      sections.push(`=== [KULLANICI EK TALİMATI] ===\n${options.custom_instructions.trim()}`);
    }

    if (sections.length === 0) {
      return undefined;
    }

    return sections.join('\n\n');
  }
}

export const promptService = new PromptService();
