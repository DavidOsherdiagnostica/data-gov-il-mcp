/**
 * Cache contract — any implementation must satisfy this interface.
 * Enables swapping between memory-cache, Redis, etc. without changing callers.
 */
export interface ICache {
  /**
   * Retrieve a cached value by key.
   * Returns undefined on miss or expiry.
   */
  get<T>(key: string): T | undefined;

  /**
   * Store a value with an optional TTL in milliseconds.
   * If ttlMs is omitted, uses the instance default.
   */
  set<T>(key: string, value: T, ttlMs?: number): void;

  /** Remove a single entry. */
  delete(key: string): void;

  /** Clear all entries. */
  clear(): void;

  /**
   * Retrieve-or-set helper: if key exists in cache, return it;
   * otherwise execute `fn`, cache the result, and return it.
   */
  getOrSet<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
}
