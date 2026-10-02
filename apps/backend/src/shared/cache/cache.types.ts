/**
 * @file cache.types.ts
 * @description Kurumsal önbellekleme arayüzleri ve tipleri.
 * Adapter deseni ile hem Redis hem de In-Memory önbellekleme desteklenir.
 */

export interface ICacheAdapter {
  /**
   * Anahtara ait veriyi önbellekten getirir.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Veriyi belirtilen TTL (saniye cinsinden) ile önbelleğe kaydeder.
   */
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;

  /**
   * Belirtilen anahtarı önbellekten siler.
   */
  del(key: string): Promise<void>;

  /**
   * Belirtilen desene (pattern) uyan tüm anahtarları siler.
   */
  delByPattern(pattern: string): Promise<void>;

  /**
   * delByPattern için alternatif alias metodu.
   */
  delPattern(pattern: string): Promise<void>;

  /**
   * Önbellek sağlayıcısının aktif ve hazır olup olmadığını döner.
   */
  isReady(): boolean;

  /**
   * Bağlantıyı güvenli şekilde kapatır.
   */
  disconnect(): Promise<void>;
}
