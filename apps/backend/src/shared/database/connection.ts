import mongoose from 'mongoose';
import { env } from '#config/env.config.js';

/**
 * MongoDB veritabanı bağlantısını başlatır.
 */
export async function connectDatabase(customUri?: string): Promise<typeof mongoose> {
  const uri = customUri || env.MONGODB_URI;

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 50,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,
    });

    console.log(`[Database] MongoDB bağlantısı başarıyla kuruldu: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen veritabanı hatası';
    console.error(`[Database Error] MongoDB bağlantısı başarısız oldu: ${message}`);
    throw error;
  }
}

/**
 * Aktif MongoDB bağlantısını güvenli biçimde sonlandırır.
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB bağlantısı sonlandırıldı.');
  }
}

/**
 * Veritabanının bağlı olup olmadığını kontrol eder.
 */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Bağlantı yaşam döngüsü event'leri
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB bağlantısı koptu.');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] MongoDB bağlantı hatası:', err);
});
