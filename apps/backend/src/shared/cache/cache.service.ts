/**
 * @file cache.service.ts
 * @description Kurumsal Önbellek Yöneticisi (Cache Manager).
 * Redis yapılandırılmışsa Redis'i, yapılandırılmamışsa veya erişilemiyorsa
 * otomatik olarak In-Memory adaptörünü kullanır (Graceful Fallback).
 */

import { env } from '#config/env.config.js';
import type { ICacheAdapter } from '#shared/cache/cache.types.js';
import { MemoryCacheAdapter } from '#shared/cache/memory-cache.adapter.js';
import { RedisCacheAdapter } from '#shared/cache/redis-cache.adapter.js';

class CacheService implements ICacheAdapter {
  private adapter: ICacheAdapter;
  private readonly memoryFallback = new MemoryCacheAdapter();

  constructor() {
    // Varsayılan olarak hafıza adaptörüyle başla
    this.adapter = this.memoryFallback;
  }

  public async init(): Promise<void> {
    const hasRedisConfig = Boolean(env.REDIS_URL || env.REDIS_HOST);

    if (hasRedisConfig) {
      try {
        const redisOptions: {
          url?: string;
          host?: string;
          port?: number;
          password?: string;
        } = {};
        if (env.REDIS_URL) redisOptions.url = env.REDIS_URL;
        if (env.REDIS_HOST) redisOptions.host = env.REDIS_HOST;
        if (env.REDIS_PORT) redisOptions.port = env.REDIS_PORT;
        if (env.REDIS_PASSWORD) redisOptions.password = env.REDIS_PASSWORD;

        const redisAdapter = new RedisCacheAdapter(redisOptions);

        const connected = await redisAdapter.connect();
        if (connected) {
          this.adapter = redisAdapter;
          return;
        }
      } catch {
        // Fallback to memory
      }
    }

    this.adapter = this.memoryFallback;
  }

  async get<T>(key: string): Promise<T | null> {
    return await this.adapter.get<T>(key);
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    await this.adapter.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.adapter.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    await this.adapter.delByPattern(pattern);
  }

  async delPattern(pattern: string): Promise<void> {
    await this.delByPattern(pattern);
  }

  isReady(): boolean {
    return this.adapter.isReady();
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }
}

export const cacheService = new CacheService();
