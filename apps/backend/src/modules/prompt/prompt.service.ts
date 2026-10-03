import { promptRepository } from '#modules/prompt/prompt.repository.js';
import type { CreatePromptDto, UpdatePromptDto } from '#modules/prompt/prompt.dto.js';
import { NotFoundError, DomainError } from '#shared/errors/index.js';
import { cacheService } from '#shared/cache/index.js';

const PROMPT_CACHE_TTL_SEC = 86400; // 24 Saat (Değişiklik olduğunda anında geçersizleştirilir)

export class PromptService {
  /**
   * Redis ve bellekteki tüm prompt önbellek anahtarlarını anında temizler.
   * Kural 6 & Kural 9: Sistem promptları değiştiğinde anında yürürlüğe girer.
   */
  async invalidatePromptCache(): Promise<void> {
    try {
      await cacheService.delPattern('prompt:*');
    } catch (err) {
      console.warn('[PromptService] Prompt önbelleği temizlenirken uyarı:', err);
    }
  }

  async createPrompt(dto: CreatePromptDto) {
    const existing = await promptRepository.getPromptBySlug(dto.slug);
    if (existing) {
      throw new DomainError(`'${dto.slug}' slug değerine sahip bir prompt zaten mevcut.`);
    }

    const created = await promptRepository.createPrompt({
      title: dto.title,
      slug: dto.slug,
      type: dto.type,
      content: dto.content,
      ...(dto.allowedRoles ? { allowed_roles: dto.allowedRoles } : {}),
      ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
      ...(dto.isDefault !== undefined ? { is_default: dto.isDefault } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
    });

    // Yeni prompt eklendiğinde Redis önbelleğini anında tazele
    await this.invalidatePromptCache();

    return created;
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

    // Prompt güncellendiğinde Redis önbelleğini anında geçersizleştir
    await this.invalidatePromptCache();

    return updated!;
  }

  async deletePrompt(id: string) {
    const deleted = await promptRepository.deletePrompt(id);
    if (!deleted) {
      throw new NotFoundError(`Silinecek prompt bulunamadı: ${id}`);
    }

    // Prompt silindiğinde Redis önbelleğini anında temizle
    await this.invalidatePromptCache();

    return { success: true, message: 'Prompt başarıyla silindi.' };
  }

  /**
   * ÇOK KATMANLI ANLIK DİNAMİK PROMPT OLUŞTURMA MOTORU (Prompt Stacking Engine)
   * Redis Read-Through Önbellek Destekli (<1ms yanıt süresi).
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
    const rolesKey =
      options.userRoles && options.userRoles.length > 0
        ? [...options.userRoles].sort().join(':')
        : 'all';

    // 1. Katman: Aktif Kurumsal Guardrail Prompt'ları (Redis Read-Through Cache)
    const guardrailCacheKey = `prompt:guardrail:${rolesKey}`;
    let guardrailText = await cacheService.get<string>(guardrailCacheKey);

    if (guardrailText === null) {
      const guardrails = await promptRepository.getActiveGuardrails(options.userRoles);
      guardrailText =
        guardrails.length > 0 ? guardrails.map((g) => `- ${g.content}`).join('\n') : '';
      await cacheService.set(guardrailCacheKey, guardrailText, PROMPT_CACHE_TTL_SEC);
    }

    if (guardrailText && guardrailText.length > 0) {
      sections.push(`=== [KURUMSAL GÜVENLİK VE POLİTİKA KURALLARI] ===\n${guardrailText}`);
    }

    // 2. Katman: Rol / Persona Prompt'u (Redis Read-Through Cache)
    let personaPrompt = '';

    if (options.prompt_id) {
      const personaCacheKey = `prompt:persona:id:${options.prompt_id}`;
      const cached = await cacheService.get<string>(personaCacheKey);

      if (cached !== null) {
        personaPrompt = cached;
      } else {
        const persona = await promptRepository.getPromptById(options.prompt_id);
        personaPrompt = persona?.is_active && persona.content ? persona.content : '';
        await cacheService.set(personaCacheKey, personaPrompt, PROMPT_CACHE_TTL_SEC);
      }
    } else {
      const defaultPersonaCacheKey = `prompt:persona:default:${rolesKey}`;
      const cached = await cacheService.get<string>(defaultPersonaCacheKey);

      if (cached !== null) {
        personaPrompt = cached;
      } else {
        const defaultPersona = await promptRepository.getDefaultPersona(options.userRoles);
        personaPrompt = defaultPersona?.content ? defaultPersona.content : '';
        await cacheService.set(defaultPersonaCacheKey, personaPrompt, PROMPT_CACHE_TTL_SEC);
      }
    }

    if (personaPrompt && personaPrompt.length > 0) {
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
