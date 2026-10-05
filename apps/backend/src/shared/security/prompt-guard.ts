/**
 * @file prompt-guard.ts
 * @description Kurumsal LLM Güvenlik Kalkanı: Doğrudan ve Dolaylı Prompt Injection,
 * Jailbreak (DAN / Dev Mode), Sistem Promptu İfşası (Prompt Leakage) ve Delimiter Breakout Tespiti.
 * 
 * OWASP Top 10 for LLM Applications:
 * - LLM01: Prompt Injection (Direct & Indirect)
 * - LLM06: Sensitive Information Disclosure (System Prompt Leakage)
 */

import { SecurityViolationError } from '#shared/errors/index.js';

export type PromptAttackCategory =
  | 'DIRECT_OVERRIDE'
  | 'JAILBREAK_PERSONA'
  | 'SYSTEM_PROMPT_LEAKAGE'
  | 'DELIMITER_INJECTION';

export interface PromptSecurityInspection {
  isSafe: boolean;
  category?: PromptAttackCategory;
  matchedRule?: string;
  reason?: string;
}

interface InjectionRule {
  category: PromptAttackCategory;
  name: string;
  pattern: RegExp;
  reason: string;
}

/**
 * ReDoS korumalı ve düşük karmaşıklıktaki (Cognitive Complexity < 20) regex kuralları.
 * Büyük/küçük harf duyarsızlığı ve normalize edilmiş beyaz boşluklarla çalışır.
 */
const INJECTION_RULES: readonly InjectionRule[] = [
  // 1. DIRECT OVERRIDE (Talimat Ezme & Sıfırlama)
  {
    category: 'DIRECT_OVERRIDE',
    name: 'EN_IGNORE_PREVIOUS',
    pattern: /\b(?:ignore|disregard|forget)\s+(?:all\s+|any\s+)?(?:previous|prior|above|system)\s+(?:instructions|rules|prompts)\b/i,
    reason: 'Önceki sistem talimatlarını ve kuralları yok sayma/ezme girişimi tespit edildi.',
  },
  {
    category: 'DIRECT_OVERRIDE',
    name: 'EN_RESET_INSTRUCTIONS',
    pattern: /\b(?:clear|reset)\s+(?:all\s+)?(?:instructions|context|rules|memory)\b/i,
    reason: 'Sistem hafızasını veya kurallarını sıfırlama girişimi tespit edildi.',
  },
  {
    category: 'DIRECT_OVERRIDE',
    name: 'TR_ONCEKI_TALIMATLARI_UNUT',
    pattern: /(?:önceki|geçmiş)\s+(?:sistem\s+)?(?:talimatlar[ıi]|kurallar[ıi]|promptlar[ıi])\s+(?:unut|sil|yoksay)\b/i,
    reason: 'Sistem kurallarını ve önceki talimatları unutturma/yok sayma girişimi tespit edildi.',
  },
  {
    category: 'DIRECT_OVERRIDE',
    name: 'TR_TUMUNU_UNUT',
    pattern: /(?:bütün|tüm)\s+(?:talimatlar[ıi]|kurallar[ıi])\s+(?:unut|sil|yoksay|iptal\s*et)\b/i,
    reason: 'Tüm kuralları ve talimatları iptal etme girişimi tespit edildi.',
  },
  {
    category: 'DIRECT_OVERRIDE',
    name: 'TR_KURALLARI_YOKSAY',
    pattern: /(?:sistem|güvenlik)\s+(?:kurallar[ıi]n[ıi]|talimatlar[ıi]n[ıi])\s+(?:yoksay|unut|atla|baypas\s*et)\b/i,
    reason: 'Güvenlik kurallarını atlama veya baypas etme girişimi tespit edildi.',
  },

  // 2. JAILBREAK & PERSONA SWITCHING (DAN, Unrestricted, Dev Mode)
  {
    category: 'JAILBREAK_PERSONA',
    name: 'EN_YOU_ARE_NOW',
    pattern: /\byou\s+are\s+now\s+(?:in\s+)?(?:dan|developer\s+mode|unrestricted|god\s+mode)\b/i,
    reason: 'Jailbreak ve kısıtlamasız çalışma modu (DAN / Dev Mode) talimatı tespit edildi.',
  },
  {
    category: 'JAILBREAK_PERSONA',
    name: 'EN_ACT_AS_UNFILTERED',
    pattern: /\bact\s+as\s+(?:a\s+|an\s+)?(?:dan|jailbroken|unfiltered|unrestricted)\b/i,
    reason: 'Filtresiz ve kuralsız model rolü taklidi tespit edildi.',
  },
  {
    category: 'JAILBREAK_PERSONA',
    name: 'EN_JAILBREAK_KEYWORDS',
    pattern: /\b(?:jailbreak\s+prompt|bypass\s+(?:your\s+)?(?:safety|filters|guardrails)|disregard\s+your\s+ethics)\b/i,
    reason: 'Etik filtreleri ve güvenlik bariyerlerini baypas etme girişimi tespit edildi.',
  },
  {
    category: 'JAILBREAK_PERSONA',
    name: 'TR_JAILBREAK_PERSONA',
    pattern: /(?:artık\s+(?:dan\s+modu|filtresiz\s+mod|kısıtlamasız\s+mod|sansürsüz))\b/i,
    reason: 'Kısıtlamasız ve güvenliksiz mod taklidi (Jailbreak Persona) tespit edildi.',
  },
  {
    category: 'JAILBREAK_PERSONA',
    name: 'TR_FILTRESIZ_DAVRAN',
    pattern: /filtresiz\s+(?:bir\s+)?(?:asistan|bot|yapay\s*zeka)\s+gibi\s+davran/i,
    reason: 'Filtresiz yapay zeka taklidi talimatı tespit edildi.',
  },
  {
    category: 'JAILBREAK_PERSONA',
    name: 'TR_KURALSIZ_KALMA',
    pattern: /hiçbir\s+kurala\s+bağlı\s+kalma\b/i,
    reason: 'Kurallara uymama ve kısıtlamaları kaldırma talimatı tespit edildi.',
  },

  // 3. SYSTEM PROMPT LEAKAGE (Sistem Talimatlarını Çalma / İfşa Etme)
  {
    category: 'SYSTEM_PROMPT_LEAKAGE',
    name: 'EN_PRINT_SYSTEM_PROMPT',
    pattern: /\b(?:repeat|print|show|reveal)\s+(?:your\s+)?(?:system\s+prompt|initial\s+prompt|core\s+instructions)\b/i,
    reason: 'Sistem promptunu veya çekirdek direktifleri ifşa etmeye yönelik girişim tespit edildi.',
  },
  {
    category: 'SYSTEM_PROMPT_LEAKAGE',
    name: 'EN_OUTPUT_INSTRUCTIONS',
    pattern: /\b(?:display|output|tell\s+me)\s+(?:your\s+)?(?:base\s+prompt|hidden\s+instructions)\b/i,
    reason: 'Gizli sistem direktiflerini ekrana yazdırma girişimi tespit edildi.',
  },
  {
    category: 'SYSTEM_PROMPT_LEAKAGE',
    name: 'TR_PROMPT_LEAKAGE',
    pattern: /sistem\s+(?:promptun[ıu]|talimat[ıi]n[ıi]|kurallar[ıi]n[ıi])\s+(?:yazdır|göster|ifşa\s*et|ekrana\s*yaz)\b/i,
    reason: 'Sistemin çekirdek promptunu dışarı sızdırma girişimi tespit edildi.',
  },
  {
    category: 'SYSTEM_PROMPT_LEAKAGE',
    name: 'TR_ILK_TALIMATLARI_SOYLE',
    pattern: /ilk\s+(?:talimatlar[ıi]n[ıi]|promptun[ıu])\s+(?:bana\s+)?(?:göster|yaz|söyle)\b/i,
    reason: 'Sisteme verilen ilk talimatları ifşa etme girişimi tespit edildi.',
  },
  {
    category: 'SYSTEM_PROMPT_LEAKAGE',
    name: 'TR_YONERGE_ISTEME',
    pattern: /sistem\s+yönergesin[ıi]\s+(?:ver|göster|yaz)\b/i,
    reason: 'Sistem yönergesini isteme girişimi tespit edildi.',
  },

  // 4. DELIMITER INJECTION (Sistem Etiketlerini Kapatma / Breakout)
  {
    category: 'DELIMITER_INJECTION',
    name: 'DELIMITER_RAG_BREAKOUT',
    pattern: /<\/untrusted_rag_context>/i,
    reason: 'RAG XML sınırlandırıcı etiketini kapatma girişimi tespit edildi.',
  },
  {
    category: 'DELIMITER_INJECTION',
    name: 'DELIMITER_USER_BREAKOUT',
    pattern: /<\/user_custom_instructions>/i,
    reason: 'Kullanıcı talimatı XML etiketini kapatma girişimi tespit edildi.',
  },
  {
    category: 'DELIMITER_INJECTION',
    name: 'DELIMITER_GUARDRAILS_BREAKOUT',
    pattern: /<\/corporate_security_guardrails>/i,
    reason: 'Kurumsal güvenlik direktif etiketini kapatma girişimi tespit edildi.',
  },
  {
    category: 'DELIMITER_INJECTION',
    name: 'DELIMITER_SYSTEM_BREAKOUT',
    pattern: /<\/system>/i,
    reason: 'Sistem direktif etiketini kapatma girişimi tespit edildi.',
  },
  {
    category: 'DELIMITER_INJECTION',
    name: 'DELIMITER_CHATML_BREAKOUT',
    pattern: /<\|im_(?:start|end)\|>/i,
    reason: 'Sistem ChatML sınırlandırıcı etiketlerini kırma ve sahte kanal açma girişimi tespit edildi.',
  },
];

export class PromptGuard {
  /**
   * Metni güvenlik kurallarına göre inceler.
   * @param text İncelenecek metin (kullanıcı mesajı, özel talimat vb.)
   * @returns İnceleme sonucu
   */
  inspect(text: string | undefined | null): PromptSecurityInspection {
    if (!text || typeof text !== 'string') {
      return { isSafe: true };
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return { isSafe: true };
    }

    // Beyaz boşlukları normalize et
    const normalized = trimmed.replace(/\s+/g, ' ');

    for (const rule of INJECTION_RULES) {
      if (rule.pattern.test(normalized)) {
        return {
          isSafe: false,
          category: rule.category,
          matchedRule: rule.name,
          reason: rule.reason,
        };
      }
    }

    return { isSafe: true };
  }

  /**
   * Metnin güvenli olduğunu doğrular; ihlal varsa SecurityViolationError fırlatır.
   * @param text Doğrulanacak metin
   * @throws {SecurityViolationError} Güvenlik ihlali durumunda
   */
  assertSafe(text: string | undefined | null): void {
    const inspection = this.inspect(text);
    if (!inspection.isSafe) {
      throw new SecurityViolationError(
        `Güvenlik Uyarısı: Girdiniz sistem güvenlik ve guardrail politikalarını ihlal eden kalıplar içermektedir (${inspection.reason})`,
        {
          category: inspection.category,
          rule: inspection.matchedRule,
        }
      );
    }
  }

  /**
   * RAG veya Kullanıcı girdilerini sistem promptuna eklemeden önce
   * XML etiket enjeksiyonunu önlemek için etiketleri temizler/nötralize eder.
   * @param text Nötralize edilecek metin
   * @returns Güvenli hale getirilmiş metin
   */
  sanitizeDelimiters(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/<\/?(?:untrusted_rag_context|user_custom_instructions|corporate_security_guardrails|system)[^>]*>/gi, '')
      .replace(/<\|im_(?:start|end)\|>/gi, '');
  }
}

export const promptGuard = new PromptGuard();
