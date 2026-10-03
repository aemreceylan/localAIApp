import { promptRepository } from '#modules/prompt/prompt.repository.js';
import type { CreatePromptDto, UpdatePromptDto } from '#modules/prompt/prompt.dto.js';
import { NotFoundError, DomainError } from '#shared/errors/index.js';

export class PromptService {
  async createPrompt(dto: CreatePromptDto) {
    const existing = await promptRepository.getPromptBySlug(dto.slug);
    if (existing) {
      throw new DomainError(`'${dto.slug}' slug değerine sahip bir prompt zaten mevcut.`);
    }

    return await promptRepository.createPrompt({
      title: dto.title,
      slug: dto.slug,
      type: dto.type,
      content: dto.content,
      ...(dto.allowedRoles ? { allowed_roles: dto.allowedRoles } : {}),
      ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
      ...(dto.isDefault !== undefined ? { is_default: dto.isDefault } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
    });
  }

  async getPrompts(filter?: { type?: string; is_active?: boolean; roles?: string[] }) {
    return await promptRepository.getPrompts(filter as any);
  }

  async getPromptById(id: string) {
    const prompt = await promptRepository.getPromptById(id);
    if (!prompt) {
      throw new NotFoundError(`Prompt bulunamadı: ${id}`);
    }
    return prompt;
  }

  async updatePrompt(id: string, dto: UpdatePromptDto) {
    await this.getPromptById(id);

    const updated = await promptRepository.updatePrompt(id, {
      ...(dto.title ? { title: dto.title } : {}),
      ...(dto.slug ? { slug: dto.slug } : {}),
      ...(dto.type ? { type: dto.type } : {}),
      ...(dto.content ? { content: dto.content } : {}),
      ...(dto.allowedRoles ? { allowed_roles: dto.allowedRoles } : {}),
      ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
      ...(dto.isDefault !== undefined ? { is_default: dto.isDefault } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
    });

    return updated!;
  }

  async deletePrompt(id: string) {
    const deleted = await promptRepository.deletePrompt(id);
    if (!deleted) {
      throw new NotFoundError(`Silinecek prompt bulunamadı: ${id}`);
    }
    return { success: true, message: 'Prompt başarıyla silindi.' };
  }

  /**
   * ÇOK KATMANLI ANLIK DİNAMİK PROMPT OLUŞTURMA MOTORU (Prompt Stacking Engine)
   * 
   * 1. Katman: Kurumsal Güvenlik & Guardrails (Zorunlu)
   * 2. Katman: Rol / Persona (Kullanıcının rollerine uygun veya seçilen uzmanlık)
   * 3. Katman: Kullanıcı Özel Talimatı (Opsiyonel)
   * 4. Katman: Kurumsal Bilgi Bankası ve Belge Alıntıları (RAG Grounding - Opsiyonel)
   */
  async buildSystemPrompt(
    options: {
      prompt_id?: string;
      custom_instructions?: string;
      userRoles?: string[];
      ragContext?: string;
    } = {}
  ): Promise<string | undefined> {
    const sections: string[] = [];

    // 1. Katman: Aktif Kurumsal Guardrail Prompt'ları (Role filtresiyle anlık DB sorgusu)
    const guardrails = await promptRepository.getActiveGuardrails(options.userRoles);
    if (guardrails.length > 0) {
      const guardrailText = guardrails.map((g) => `- ${g.content}`).join('\n');
      sections.push(`=== [KURUMSAL GÜVENLİK VE POLİTİKA KURALLARI] ===\n${guardrailText}`);
    }

    // 2. Katman: Rol / Persona Prompt'u (Anlık DB sorgusu)
    let personaPrompt = '';
    if (options.prompt_id) {
      const persona = await promptRepository.getPromptById(options.prompt_id);
      if (persona?.is_active) {
        personaPrompt = persona.content;
      }
    } else {
      const defaultPersona = await promptRepository.getDefaultPersona(options.userRoles);
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

    // 4. Katman: Kurumsal Bilgi Bankası ve Belge Alıntıları (RAG Grounding)
    if (options.ragContext && options.ragContext.trim() !== '') {
      sections.push(`=== [KURUMSAL BİLGİ BANKASI VE ONAYLI REFERANS BELGELER (RAG)] ===\n${options.ragContext.trim()}`);
    }

    if (sections.length === 0) {
      return undefined;
    }

    return sections.join('\n\n');
  }
}

export const promptService = new PromptService();
