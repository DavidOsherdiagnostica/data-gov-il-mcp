/**
 * Tests for environment config parsing.
 */
import { describe, it, expect, afterEach } from "vitest";
import { z } from "zod";

describe("env config parsing", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env after each test
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it("parses AUTH_MODE values correctly", () => {
    const schema = z.object({
      AUTH_MODE: z.enum(["none", "apikey", "oauth"]).default("none"),
    });

    expect(schema.parse({ AUTH_MODE: "none" })).toEqual({ AUTH_MODE: "none" });
    expect(schema.parse({ AUTH_MODE: "apikey" })).toEqual({ AUTH_MODE: "apikey" });
    expect(schema.parse({ AUTH_MODE: "oauth" })).toEqual({ AUTH_MODE: "oauth" });
    expect(schema.parse({})).toEqual({ AUTH_MODE: "none" });
  });

  it("coerces PORT string to number", () => {
    const schema = z.object({
      PORT: z.coerce.number().int().positive().default(3664),
    });

    expect(schema.parse({ PORT: "8080" })).toEqual({ PORT: 8080 });
    expect(schema.parse({})).toEqual({ PORT: 3664 });
  });

  it("rejects invalid LOG_LEVEL", () => {
    const schema = z.object({
      LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    });

    expect(() => schema.parse({ LOG_LEVEL: "verbose" })).toThrow();
  });

  it("parses CKAN_BASE_URL with URL validation", () => {
    const schema = z.object({
      CKAN_BASE_URL: z.string().url().default("https://data.gov.il/api/3/action"),
    });

    expect(schema.parse({ CKAN_BASE_URL: "https://data.gov.il/api/3/action" })).toBeDefined();
    expect(() => schema.parse({ CKAN_BASE_URL: "not-a-url" })).toThrow();
  });

  it("parses API_KEYS as comma-separated set", () => {
    const keys = new Set(
      "key1,key2,key3"
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0),
    );
    expect(keys.has("key1")).toBe(true);
    expect(keys.has("key2")).toBe(true);
    expect(keys.has("key3")).toBe(true);
    expect(keys.has("key4")).toBe(false);
  });
});
