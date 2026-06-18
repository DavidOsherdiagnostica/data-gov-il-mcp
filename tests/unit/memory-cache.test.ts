/**
 * Tests for in-memory TTL cache.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryCache } from "../../src/cache/memory-cache.js";

describe("MemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({ defaultTtlMs: 1000, maxItems: 100 });
  });

  it("stores and retrieves values", () => {
    cache.set("key1", { data: "value1" });
    expect(cache.get("key1")).toEqual({ data: "value1" });
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("deletes entries", () => {
    cache.set("key1", "value");
    cache.delete("key1");
    expect(cache.get("key1")).toBeUndefined();
  });

  it("clears all entries", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });

  it("getOrSet returns cached value on hit", async () => {
    cache.set("x", "cached");
    const fn = vi.fn().mockResolvedValue("fresh");
    const result = await cache.getOrSet("x", 1000, fn);
    expect(result).toBe("cached");
    expect(fn).not.toHaveBeenCalled();
  });

  it("getOrSet calls fn on miss and caches result", async () => {
    const fn = vi.fn().mockResolvedValue("computed");
    const result = await cache.getOrSet("missing", 1000, fn);
    expect(result).toBe("computed");
    expect(fn).toHaveBeenCalledOnce();
    // Second call should hit cache
    const result2 = await cache.getOrSet("missing", 1000, fn);
    expect(result2).toBe("computed");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("evicts entries after TTL", async () => {
    const shortLived = new MemoryCache({ defaultTtlMs: 50, maxItems: 100 });
    shortLived.set("k", "v", 50);
    expect(shortLived.get("k")).toBe("v");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(shortLived.get("k")).toBeUndefined();
  });
});
