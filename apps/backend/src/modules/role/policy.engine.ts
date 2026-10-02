/**
 * @file policy.engine.ts
 * @description Kurumsal Yetkilendirme ve Politika Motoru (Policy Engine).
 * SOLID Open/Closed Prensibine (OCP) tam uyumludur:
 * - Çekirdek yetki denetimi kapalıdır (Closed for modification).
 * - Yeni kaynak stratejileri ve izin kuralları çalışma zamanında enjekte edilebilir (Open for extension).
 */

import type { IUser } from '#modules/auth/user.model.js';
import type { IPermissionStrategy } from '#modules/role/role.types.js';
import { roleService } from '#modules/role/role.service.js';

export class PolicyEngine {
  private static readonly strategies: Map<string, IPermissionStrategy> = new Map();

  /**
   * OCP Enjeksiyon Metodu:
   * Yeni bir kaynak türü (örn: 'rag', 'prompt') için özel değerlendirme stratejisi ekler.
   *
   * @param resource Kaynak öneki (örn: 'rag', 'user')
   * @param strategy Strateji uygulayıcısı
   */
  public static registerStrategy(resource: string, strategy: IPermissionStrategy): void {
    this.strategies.set(resource.toLowerCase(), strategy);
  }

  /**
   * Kullanıcının istenen izne sahip olup olmadığını denetler.
   *
   * @param user Kimliği doğrulanmış kullanıcı nesnesi
   * @param permission Kontrol edilecek izin stringi (örn: 'user:ban', 'rag:document:read')
   * @param context İsteğe bağlı nesne bağlamı (örn: erişilmek istenen doküman veya prompt nesnesi)
   * @returns İzin verilmişse true, aksi halde false
   */
  public static async can(user: IUser, permission: string, context?: any): Promise<boolean> {
    // 1. KURAL: Kullanıcı hesabı askıya alınmışsa (banlıysa) hiçbir işlem yapamaz
    if (!user || user.is_active === false) {
      return false;
    }

    // 2. KURAL: Superadmin her şeyi yapabilir (Sistemik Tam Yetki)
    if (user.system_role === 'superadmin') {
      return true;
    }

    // 3. KURAL: İlgili kaynak için kayıtlı özel bir strateji var mı?
    const [resource] = permission.split(':');
    const targetResource = resource ?? '';
    const customStrategy = this.strategies.get(targetResource.toLowerCase());
    if (customStrategy) {
      const allowed = await customStrategy.can(user, permission, context);
      if (allowed) {
        return true;
      }
    }

    // 4. KURAL: Kullanıcının rollerine göre yetki haritasını çözümle
    // Standart roller listesine kullanıcının system_role değeri de eklenir
    const effectiveRoles = [...(user.roles || [])];
    if (user.system_role && !effectiveRoles.includes(user.system_role)) {
      effectiveRoles.push(user.system_role);
    }

    const permissions = await roleService.getPermissionsForRoles(effectiveRoles);

    // Joker karakter '*' veya spesifik izin var mı?
    return permissions.has('*') || permissions.has(permission);
  }
}
