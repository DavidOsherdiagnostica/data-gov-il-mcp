/**
 * OAuth 2.1 Protected Resource Metadata endpoint.
 * Exposes /.well-known/oauth-protected-resource as required by MCP OAuth spec.
 *
 * Reference: https://www.rfc-editor.org/rfc/rfc9728
 */
import type { Request, Router } from "express";
import type { EnvConfig } from "../config/env.js";

export const PROTECTED_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  bearer_methods_supported: string[];
  resource_signing_alg_values_supported: string[];
}

function requestOrigin(req: Request, env: EnvConfig): string {
  const host = req.get("host") ?? `${env.HOST}:${env.PORT}`;
  return `${req.protocol}://${host}`;
}

/**
 * Canonical MCP resource identifier used by OAuth Resource Indicators (RFC 8707).
 * Prefer OAUTH_RESOURCE_SERVER in production so clients and authorization servers
 * agree on one stable audience/resource value.
 */
export function protectedResourceIdentifier(req: Request, env: EnvConfig): string {
  return env.OAUTH_RESOURCE_SERVER ?? `${requestOrigin(req, env)}/mcp`;
}

/**
 * Metadata endpoint URL advertised in WWW-Authenticate.
 * MCP's stable authorization spec points clients to this well-known endpoint.
 */
export function protectedResourceMetadataUrl(req: Request, env: EnvConfig): string {
  const resource = new URL(protectedResourceIdentifier(req, env));
  return `${resource.origin}${PROTECTED_RESOURCE_METADATA_PATH}`;
}

export function protectedResourceMetadata(req: Request, env: EnvConfig): ProtectedResourceMetadata {
  return {
    resource: protectedResourceIdentifier(req, env),
    authorization_servers: env.OAUTH_ISSUER ? [env.OAUTH_ISSUER] : [],
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: ["RS256", "ES256"],
  };
}

function quoteHeaderValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function oauthWwwAuthenticateHeader(
  req: Request,
  env: EnvConfig,
  error?: "invalid_token" | "insufficient_scope",
): string {
  const params = [
    "Bearer",
    `realm=${quoteHeaderValue("data-gov-il-mcp")}`,
    `resource_metadata=${quoteHeaderValue(protectedResourceMetadataUrl(req, env))}`,
  ];

  if (error) {
    params.push(`error=${quoteHeaderValue(error)}`);
  }

  return params.join(", ");
}

export function registerWellKnown(router: Router, env: EnvConfig): void {
  if (env.AUTH_MODE !== "oauth") return;

  router.get(PROTECTED_RESOURCE_METADATA_PATH, (req, res) => {
    res.json(protectedResourceMetadata(req, env));
  });
}
