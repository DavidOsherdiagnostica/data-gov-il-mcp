/**
 * In-memory TTL + LRU cache backed by lru-cache.
 */
import { LRUCache } from "lru-cache";
import type { ICache } from "./cache.interface.js";

export interface MemoryCacheOptions {
  /** Default TTL for entries in milliseconds. */
  defaultTtlMs: number;
  /** Maximum number of entries to retain. Oldest entries are evicted first. */
  maxItems: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyValue = any;

export class MemoryCache implements ICache {
  private readonly lru: LRUCache<string, AnyValue>;
  private readonly defaultTtlMs: number;

  constructor(opts: MemoryCacheOptions) {
    this.defaultTtlMs = opts.defaultTtlMs;
    this.lru = new LRUCache<string, AnyValue>({
      max: opts.maxItems,
      ttl: opts.defaultTtlMs,
      ttlAutopurge: true,
    });
  }

  get<T>(key: string): T | undefined {
    return this.lru.get(key) as T | undefined;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.lru.set(key, value, { ttl: ttlMs ?? this.defaultTtlMs });
  }

  delete(key: string): void {
    this.lru.delete(key);
  }

  clear(): void {
    this.lru.clear();
  }

  async getOrSet<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  }
}
