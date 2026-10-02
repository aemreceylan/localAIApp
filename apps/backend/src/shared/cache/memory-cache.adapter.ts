/**
 * @file memory-cache.adapter.ts
 * @description Redis'in kurulu olmadığı ortamlarda veya yerel testlerde
 * kesintisiz çalışan yüksek performanslı In-Memory Önbellek Adaptörü.
 */

import type { ICacheAdapter } from '#shared/cache/cache.types.js';

interface CacheEntry {
  value: any;
  expiresAt: number | null;
}

export class MemoryCacheAdapter implements ICacheAdapter {
  private readonly store: Map<string, CacheEntry> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    // Regex deseni oluştur (örn: "role:*" -> /^role:.*$/)
    const regex = new RegExp(`^${pattern.replaceAll('*', '.*')}$`);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async delPattern(pattern: string): Promise<void> {
    await this.delByPattern(pattern);
  }

  isReady(): boolean {
    return true;
  }

  async disconnect(): Promise<void> {
    this.store.clear();
  }
}
