/**
 * Tests for authentication providers.
 */
import { describe, it, expect } from "vitest";
import type { Request } from "express";
import { NoopProvider } from "../../src/auth/providers/noop.provider.js";
import { ApiKeyProvider } from "../../src/auth/providers/apikey.provider.js";

function makeRequest(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {},
  } as unknown as Request;
}

describe("NoopProvider", () => {
  it("always returns anonymous context", async () => {
    const provider = new NoopProvider();
    const ctx = await provider.authenticate(makeRequest());
    expect(ctx).not.toBeNull();
    expect(ctx?.subject).toBe("anonymous");
  });
});

describe("ApiKeyProvider", () => {
  const validKeys = new Set(["secret-key-1", "secret-key-2"]);

  it("returns null when no Authorization header", async () => {
    const provider = new ApiKeyProvider(validKeys);
    const ctx = await provider.authenticate(makeRequest());
    expect(ctx).toBeNull();
  });

  it("returns null when non-Bearer scheme", async () => {
    const provider = new ApiKeyProvider(validKeys);
    const ctx = await provider.authenticate(makeRequest("Basic dXNlcjpwYXNz"));
    expect(ctx).toBeNull();
  });

  it("returns AuthContext for valid key", async () => {
    const provider = new ApiKeyProvider(validKeys);
    const ctx = await provider.authenticate(makeRequest("Bearer secret-key-1"));
    expect(ctx).not.toBeNull();
    expect(ctx?.subject).toContain("apikey:");
    expect(ctx?.credential).toBe("secret-key-1");
  });

  it("throws for invalid key", async () => {
    const provider = new ApiKeyProvider(validKeys);
    await expect(provider.authenticate(makeRequest("Bearer invalid-key"))).rejects.toThrow(
      "Invalid API key",
    );
  });
});
