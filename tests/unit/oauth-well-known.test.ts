/**
 * Tests for MCP OAuth Protected Resource Metadata (RFC 9728).
 */
import { describe, it, expect, vi } from "vitest";
import type { Request, Response, Router, NextFunction } from "express";
import pino from "pino";
import type { EnvConfig } from "../../src/config/env.js";
import type { IAuthProvider } from "../../src/auth/auth.interface.js";
import { createAuthMiddleware } from "../../src/auth/express-middleware.js";
import {
  PROTECTED_RESOURCE_METADATA_PATH,
  oauthWwwAuthenticateHeader,
  protectedResourceIdentifier,
  protectedResourceMetadata,
  protectedResourceMetadataUrl,
  registerWellKnown,
} from "../../src/auth/well-known.js";

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
    AUTH_MODE: "oauth",
    API_KEYS: "",
    OAUTH_ISSUER: "https://auth.example.com",
    OAUTH_AUDIENCE: "https://mcp.example.com/mcp",
    OAUTH_JWKS_URI: "https://auth.example.com/.well-known/jwks.json",
    OAUTH_RESOURCE_SERVER: "https://mcp.example.com/mcp",
    TRUST_PROXY: false,
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_MAX: 120,
    ALLOWED_HOSTS: "",
    ALLOWED_ORIGINS: "",
    NODE_ENV: "test",
    ...overrides,
  };
}

function makeRequest(protocol = "https", host = "mcp.example.com"): Request {
  return {
    protocol,
    path: "/mcp",
    get(name: string) {
      return name.toLowerCase() === "host" ? host : undefined;
    },
    headers: {},
  } as unknown as Request;
}

describe("OAuth protected resource metadata", () => {
  it("uses OAUTH_RESOURCE_SERVER as the canonical resource identifier", () => {
    const env = makeEnv();
    const req = makeRequest();

    expect(protectedResourceIdentifier(req, env)).toBe("https://mcp.example.com/mcp");
  });

  it("falls back to request origin plus /mcp when OAUTH_RESOURCE_SERVER is unset", () => {
    const env = makeEnv({ OAUTH_RESOURCE_SERVER: undefined });
    const req = makeRequest("https", "public.example.test");

    expect(protectedResourceIdentifier(req, env)).toBe("https://public.example.test/mcp");
  });

  it("builds the RFC 9728 metadata endpoint URL from the resource origin", () => {
    const env = makeEnv({ OAUTH_RESOURCE_SERVER: "https://mcp.example.com/api/mcp" });
    const req = makeRequest();

    expect(protectedResourceMetadataUrl(req, env)).toBe(
      "https://mcp.example.com/.well-known/oauth-protected-resource",
    );
  });

  it("returns protected resource metadata with an authorization server", () => {
    const env = makeEnv();
    const req = makeRequest();

    expect(protectedResourceMetadata(req, env)).toEqual({
      resource: "https://mcp.example.com/mcp",
      authorization_servers: ["https://auth.example.com"],
      bearer_methods_supported: ["header"],
      resource_signing_alg_values_supported: ["RS256", "ES256"],
    });
  });

  it("registers the well-known route only in OAuth mode", () => {
    const router = { get: vi.fn() } as unknown as Router;

    registerWellKnown(router, makeEnv());
    expect(router.get).toHaveBeenCalledWith(PROTECTED_RESOURCE_METADATA_PATH, expect.any(Function));

    const openRouter = { get: vi.fn() } as unknown as Router;
    registerWellKnown(openRouter, makeEnv({ AUTH_MODE: "none" }));
    expect(openRouter.get).not.toHaveBeenCalled();
  });

  it("builds WWW-Authenticate with resource_metadata for MCP clients", () => {
    const env = makeEnv();
    const req = makeRequest();

    expect(oauthWwwAuthenticateHeader(req, env)).toBe(
      'Bearer, realm="data-gov-il-mcp", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
    );
    expect(oauthWwwAuthenticateHeader(req, env, "invalid_token")).toContain(
      'error="invalid_token"',
    );
  });
});

describe("OAuth auth middleware challenge", () => {
  it("includes resource_metadata on unauthenticated OAuth requests", async () => {
    const env = makeEnv();
    const provider: IAuthProvider = {
      authenticate: () => Promise.resolve(null),
    };
    const middleware = createAuthMiddleware(provider, logger, env);
    const req = makeRequest();
    const res = makeResponse();
    const next = vi.fn<NextFunction>();

    middleware(req, res.response, next);
    await Promise.resolve();

    expect(res.setHeader).toHaveBeenCalledWith(
      "WWW-Authenticate",
      'Bearer, realm="data-gov-il-mcp", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
    );
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

function makeResponse() {
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);

  return {
    response: response as unknown as Response,
    setHeader: response.setHeader,
    status: response.status,
    json: response.json,
  };
}
