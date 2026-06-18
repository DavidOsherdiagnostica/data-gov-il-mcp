/**
 * Tests for HTTP Host / Origin validation.
 */
import { describe, it, expect, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import pino from "pino";
import type { EnvConfig } from "../../src/config/env.js";
import {
  allowedHosts,
  allowedOrigins,
  createHostOriginGuard,
  defaultAllowedHosts,
  isHostAllowed,
  isOriginAllowed,
  parseHost,
} from "../../src/transports/security/host-origin-guard.js";

const logger = pino({ level: "silent" });

function makeEnv(overrides: Partial<EnvConfig> = {}): EnvConfig {
  return {
    TRANSPORT: "http",
    PORT: 3664,
    HOST: "0.0.0.0",
    CORS_ORIGIN: "*",
    LOG_LEVEL: "info",
    CKAN_BASE_URL: "https://data.gov.il/api/3/action",
    CKAN_TIMEOUT_MS: 10_000,
    CKAN_SEARCH_TIMEOUT_MS: 15_000,
    CACHE_TTL_MS: 300_000,
    CACHE_MAX_ITEMS: 500,
    AUTH_MODE: "none",
    API_KEYS: "",
    TRUST_PROXY: false,
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_MAX: 120,
    ALLOWED_HOSTS: "",
    ALLOWED_ORIGINS: "",
    NODE_ENV: "production",
    ...overrides,
  };
}

describe("host origin guard helpers", () => {
  it("parses host headers with ports and IPv6 brackets", () => {
    expect(parseHost("localhost:3664")).toEqual({ hostname: "localhost", port: "3664" });
    expect(parseHost("[::1]:3664")).toEqual({ hostname: "::1", port: "3664" });
    expect(parseHost("EXAMPLE.com")).toEqual({ hostname: "example.com", port: undefined });
  });

  it("defaults allowed hosts to loopback only for wildcard binds", () => {
    const env = makeEnv();

    expect(defaultAllowedHosts(env)).toEqual(["localhost", "127.0.0.1", "::1"]);
    expect(isHostAllowed("localhost:3664", env)).toBe(true);
    expect(isHostAllowed("127.0.0.1:3664", env)).toBe(true);
    expect(isHostAllowed("[::1]:3664", env)).toBe(true);
    expect(isHostAllowed("evil.example.com", env)).toBe(false);
  });

  it("adds non-wildcard HOST to default allowed hosts", () => {
    const env = makeEnv({ HOST: "mcp.internal.test" });

    expect(defaultAllowedHosts(env)).toContain("mcp.internal.test");
    expect(isHostAllowed("mcp.internal.test:3664", env)).toBe(true);
  });

  it("uses ALLOWED_HOSTS when configured", () => {
    const env = makeEnv({ ALLOWED_HOSTS: "mcp.example.com,api.example.com:8443" });

    expect(allowedHosts(env)).toHaveLength(2);
    expect(isHostAllowed("mcp.example.com:443", env)).toBe(true);
    expect(isHostAllowed("api.example.com:8443", env)).toBe(true);
    expect(isHostAllowed("api.example.com:3664", env)).toBe(false);
  });

  it("uses ALLOWED_ORIGINS before CORS_ORIGIN", () => {
    const env = makeEnv({
      ALLOWED_ORIGINS: "https://client.example.com",
      CORS_ORIGIN: "https://other.example.com",
    });

    expect(allowedOrigins(env)).toEqual(["https://client.example.com"]);
    expect(isOriginAllowed("https://client.example.com", env)).toBe(true);
    expect(isOriginAllowed("https://other.example.com", env)).toBe(false);
  });

  it("uses CORS_ORIGIN as origin fallback when it is not wildcard", () => {
    const env = makeEnv({ CORS_ORIGIN: "https://client.example.com" });

    expect(allowedOrigins(env)).toEqual(["https://client.example.com"]);
    expect(isOriginAllowed("https://client.example.com", env)).toBe(true);
    expect(isOriginAllowed("https://evil.example.com", env)).toBe(false);
  });

  it("rejects browser origins by default in production when no origin allowlist exists", () => {
    const env = makeEnv({ CORS_ORIGIN: "*", NODE_ENV: "production" });

    expect(isOriginAllowed(undefined, env)).toBe(true);
    expect(isOriginAllowed("https://evil.example.com", env)).toBe(false);
  });
});

describe("createHostOriginGuard", () => {
  it("allows requests with permitted Host and no Origin", () => {
    const guard = createHostOriginGuard(makeEnv(), logger);
    const req = makeRequest({ host: "localhost:3664" });
    const res = makeResponse();
    const next = vi.fn<NextFunction>();

    guard(req, res.response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects disallowed Host before routes run", () => {
    const guard = createHostOriginGuard(makeEnv(), logger);
    const req = makeRequest({ host: "evil.example.com" });
    const res = makeResponse();
    const next = vi.fn<NextFunction>();

    guard(req, res.response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden",
      message: "Host is not allowed",
    });
  });

  it("rejects disallowed Origin", () => {
    const guard = createHostOriginGuard(
      makeEnv({ ALLOWED_HOSTS: "mcp.example.com", ALLOWED_ORIGINS: "https://client.example.com" }),
      logger,
    );
    const req = makeRequest({
      host: "mcp.example.com",
      origin: "https://evil.example.com",
    });
    const res = makeResponse();
    const next = vi.fn<NextFunction>();

    guard(req, res.response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden",
      message: "Origin is not allowed",
    });
  });
});

function makeRequest(headers: { host?: string; origin?: string }): Request {
  return {
    path: "/mcp",
    requestId: "test-request",
    headers,
  } as unknown as Request;
}

function makeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);

  return {
    response: response as unknown as Response,
    status: response.status,
    json: response.json,
  };
}
