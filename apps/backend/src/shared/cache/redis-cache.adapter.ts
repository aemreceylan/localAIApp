/**
 * @file redis-cache.adapter.ts
 * @description Kurumsal Redis önbellek adaptörü (ioredis).
 * Dağıtık ortamlarda oturum, rol ve yetki önbelleklemesi için kullanılır.
 */

import { Redis } from 'ioredis';
import type { ICacheAdapter } from '#shared/cache/cache.types.js';

export class RedisCacheAdapter implements ICacheAdapter {
  private readonly client: Redis;
  private connected = false;

  constructor(options: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
  }) {
    if (options.url) {
      this.client = new Redis(options.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
      });
    } else {
      this.client = new Redis({
        host: options.host || 'localhost',
        port: options.port || 6379,
        password: options.password,
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
      });
    }

    this.client.on('connect', () => {
      this.connected = true;
    });

    this.client.on('ready', () => {
      this.connected = true;
    });

    this.client.on('error', () => {
      this.connected = false;
    });

    this.client.on('close', () => {
      this.connected = false;
    });
  }

  async connect(): Promise<boolean> {
    try {
      await this.client.connect();
      this.connected = true;
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.connected) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch {
      // Redis erişim hatası oluşursa sessizce devam et
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(key);
    } catch {
      // Redis erişim hatası
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.connected) return;
    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      const keysToDelete: string[] = [];
      for await (const chunk of stream) {
        keysToDelete.push(...chunk);
      }

      if (keysToDelete.length > 0) {
        await this.client.del(...keysToDelete);
      }
    } catch {
      // Redis erişim hatası
    }
  }

  async delPattern(pattern: string): Promise<void> {
    await this.delByPattern(pattern);
  }

  isReady(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    } finally {
      this.connected = false;
    }
  }
}
