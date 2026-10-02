/**
 * @file policy.engine.ts
 * @description Kurumsal Yetkilendirme ve Politika Motoru (Policy Engine).
 * SOLID Open/Closed Prensibine (OCP) tam uyumludur:
 * - Çekirdek yetki denetimi kapalıdır (Closed for modification).
 * - Yeni kaynak stratejileri ve izin kuralları çalışma zamanında enjekte edilebilir (Open for extension).
 *
 * 5 Aşamalı Çözümleme Sırası:
 * 1. Hesap Aktifliği (Ban kontrolü) -> Pasif ise false
 * 2. Superadmin Kök Yetki -> true (Dokunulmaz Root)
 * 3. Kullanıcı Deny İstisnası -> custom_permissions.deny içinde varsa false
 * 4. Kullanıcı Allow İstisnası -> custom_permissions.allow içinde varsa true
 * 5. Rol İzinleri ve Kaynak Stratejileri -> Role permissions birleşimi
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
   * Kullanıcının istenen izne sahip olup olmadığını hiyerarşik olarak denetler.
   *
   * @param user Kimliği doğrulanmış kullanıcı nesnesi
   * @param permission Kontrol edilecek 3 parçalı izin stringi (örn: 'admin:user:ban', 'user:rag:read')
   * @param context İsteğe bağlı nesne bağlamı (örn: hedef kullanıcı veya doküman nesnesi)
   * @returns İzin verilmişse true, aksi halde false
   */
  public static async can(user: IUser, permission: string, context?: unknown): Promise<boolean> {
    // 1. KURAL: Kullanıcı hesabı askıya alınmışsa (banlıysa) hiçbir işlem yapamaz
    if (!user || user.is_active === false) {
      return false;
    }

    // 2. KURAL: Superadmin her şeyi yapabilir (Sistemik Tam Yetki / Root Dokunulmazlığı)
    if (user.system_role === 'superadmin') {
      return true;
    }

    // 3. KURAL: Kullanıcıya özel DENY listesinde mi? (İstisna iptali en yüksek önceliğe sahiptir)
    if (user.custom_permissions?.deny?.includes(permission)) {
      return false;
    }

    // 4. KURAL: Kullanıcıya özel ALLOW listesinde mi? (İstisna izin doğrudan hak tanır)
    if (user.custom_permissions?.allow?.includes(permission)) {
      return true;
    }

    // 5. KURAL: İlgili kaynak için kayıtlı özel bir strateji var mı?
    // Format: <archetype>:<category>:<action> (örn: 'admin:rag:upload' -> kategori 'rag')
    const parts = permission.split(':');
    const category = parts.length > 2 ? parts[1] : parts[0];
    const targetResource = category ?? '';
    const customStrategy = this.strategies.get(targetResource.toLowerCase());
    if (customStrategy) {
      const allowed = await customStrategy.can(user, permission, context);
      if (allowed) {
        return true;
      }
    }

    // 6. KURAL: Kullanıcının rollerine göre yetki haritasını çözümle
    const effectiveRoles = [...(user.roles || [])];
    if (user.system_role === 'admin' && !effectiveRoles.includes('system_admin')) {
      effectiveRoles.push('system_admin');
    }

    const permissions = await roleService.getPermissionsForRoles(effectiveRoles);

    // Joker karakter '*' veya spesifik izin var mı?
    return permissions.has('*') || permissions.has(permission);
  }
}
