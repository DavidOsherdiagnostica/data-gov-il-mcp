/**
 * Environment configuration — single source of truth.
 * Parsed and validated once at startup via Zod.
 * Every other module imports from here, never from process.env directly.
 */
import { z } from "zod";

const envBoolean = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off", ""].includes(normalized)) return false;

  return value;
}, z.boolean());

const envSchema = z.object({
  // ─── Transport ──────────────────────────────────────────────────────────────
  /** Which transport to use when started without a dedicated entry. */
  TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),

  // ─── HTTP server ────────────────────────────────────────────────────────────
  PORT: z.coerce.number().int().positive().default(3664),
  HOST: z.string().default("0.0.0.0"),
  /** Allowed CORS origins. Use '*' for open access (development only). */
  CORS_ORIGIN: z.string().default("*"),

  // ─── Logging ────────────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // ─── CKAN API ───────────────────────────────────────────────────────────────
  CKAN_BASE_URL: z.string().url().default("https://data.gov.il/api/3/action"),
  /** Default request timeout in milliseconds. */
  CKAN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  /** Timeout for datastore_search (heavier queries). */
  CKAN_SEARCH_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

  // ─── Cache ──────────────────────────────────────────────────────────────────
  /** Default TTL for cached responses in milliseconds (5 minutes). */
  CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(300_000),
  /** Maximum number of entries per cache instance. */
  CACHE_MAX_ITEMS: z.coerce.number().int().positive().default(500),

  // ─── Authentication ─────────────────────────────────────────────────────────
  /**
   * Authentication mode for the HTTP endpoint:
   * - "none"   — no authentication (default for stdio, development HTTP)
   * - "apikey" — Bearer token validated against API_KEYS list
   * - "oauth"  — JWT validated against OAUTH_JWKS_URI (MCP OAuth 2.1 Resource Server)
   */
  AUTH_MODE: z.enum(["none", "apikey", "oauth"]).default("none"),

  /**
   * Comma-separated list of valid API keys.
   * Used when AUTH_MODE=apikey.
   * Example: "key1,key2,key3"
   */
  API_KEYS: z.string().default(""),

  /**
   * OAuth 2.1: The expected token issuer (iss claim).
   * Example: "https://auth.example.com"
   */
  OAUTH_ISSUER: z.string().optional(),

  /**
   * OAuth 2.1: The expected audience (aud claim).
   * Example: "https://mcp.example.com"
   */
  OAUTH_AUDIENCE: z.string().optional(),

  /**
   * OAuth 2.1: JWKS endpoint URL for public key retrieval.
   * Example: "https://auth.example.com/.well-known/jwks.json"
   */
  OAUTH_JWKS_URI: z.string().url().optional(),

  /**
   * OAuth 2.1: The URL of this MCP server resource (used in Protected Resource Metadata).
   * Example: "https://mcp.example.com"
   */
  OAUTH_RESOURCE_SERVER: z.string().url().optional(),

  // ─── HTTP hardening ─────────────────────────────────────────────────────────
  /**
   * Trust the X-Forwarded-For / X-Forwarded-Proto headers from a reverse proxy.
   * Set to "true" or a number (hop count) when running behind nginx/Caddy/ALB.
   * Needed for rate limiting to work correctly behind proxies.
   */
  TRUST_PROXY: z.union([z.coerce.boolean(), z.coerce.number()]).default(false),

  /**
   * Rate limiting window in milliseconds (default: 1 minute).
   * Set to 0 to disable rate limiting.
   */
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().nonnegative().default(60_000),

  /**
   * Maximum requests per RATE_LIMIT_WINDOW_MS per IP (default: 120).
   * Set to 0 to disable rate limiting.
   */
  RATE_LIMIT_MAX: z.coerce.number().int().nonnegative().default(120),

  /**
   * Comma-separated Host header allowlist for HTTP transport DNS rebinding protection.
   * Defaults to localhost/loopback only when unset.
   * Entries may be hostnames, IPs, or host:port pairs.
   */
  ALLOWED_HOSTS: z.string().default(""),

  /**
   * Comma-separated Origin header allowlist for browser-originated HTTP requests.
   * When unset, CORS_ORIGIN is used if it is not "*".
   */
  ALLOWED_ORIGINS: z.string().default(""),

  // ─── Service identity (overridable, defaults come from package.json) ────────
  SERVICE_NAME: z.string().optional(),
  SERVICE_VERSION: z.string().optional(),
  SERVICE_DESCRIPTION: z.string().optional(),

  // ─── Optional MCP client features ───────────────────────────────────────────
  /**
   * Enable MCP Elicitation support in tools that explicitly opt into interactive flows.
   * Disabled by default because not all MCP clients support elicitation.
   */
  MCP_ENABLE_ELICITATION: envBoolean.default(false),

  /**
   * Enable MCP Sampling-dependent tools.
   * Disabled by default because sampling availability varies by MCP client.
   */
  MCP_ENABLE_SAMPLING: envBoolean.default(false),

  // ─── Node.js runtime environment ────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parsed and validated environment configuration.
 * Calling this will throw (and exit) on invalid config.
 */
function loadEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    process.stderr.write(
      `[data-gov-il-mcp] Fatal: Invalid environment configuration:\n${formatted}\n`,
    );
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

/** Derived helpers */
export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

/** Parse API_KEYS string into a Set for O(1) lookup. */
export const apiKeys: ReadonlySet<string> = new Set(
  env.API_KEYS.split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0),
);
