/**
 * @file auth.utils.ts
 * @description Parola hashleme, doğrulama ve kriptografik Opaque Bearer Token yardımcıları.
 * Dış npm paketi gerektirmeksizin yerel Node.js `crypto` modülü ile OWASP standartlarında çalışır.
 */

import crypto from 'node:crypto';

const SCRYPT_KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const TOKEN_PREFIX = 'nx_live_';

/**
 * Düz metin parolayı rastgele tuz (salt) ve scrypt algoritması ile güvenli hash'e dönüştürür.
 * Format: `salt:derivedKeyHex`
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Girilen parolayı veritabanında saklanan tuzlanmış scrypt hash ile timing-safe biçimde doğrular.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!storedHash || !storedHash.includes(':')) {
      return resolve(false);
    }

    const [salt, keyHex] = storedHash.split(':');
    if (!salt || !keyHex) {
      return resolve(false);
    }

    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (err, derivedKey) => {
      if (err) return resolve(false);

      try {
        const storedKeyBuffer = Buffer.from(keyHex, 'hex');
        // Zamanlama saldırılarını (Timing attack) önlemek için sabit zamanlı karşılaştırma
        if (storedKeyBuffer.length !== derivedKey.length) {
          return resolve(false);
        }
        resolve(crypto.timingSafeEqual(storedKeyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * 64 karakterlik kriptografik yüksek entropili Opaque Bearer Token üretir.
 * Örnek: `nx_live_7a8b9c...`
 */
export function generateOpaqueToken(): string {
  const randomHex = crypto.randomBytes(32).toString('hex');
  return `${TOKEN_PREFIX}${randomHex}`;
}

/**
 * Opaque Token'ın veritabanında saklanacak SHA-256 hash özetini üretir.
 * Veritabanı sızsa bile ham token ele geçirilemez.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}
