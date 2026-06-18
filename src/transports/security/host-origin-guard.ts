/**
 * Host / Origin validation for Streamable HTTP.
 *
 * MCP's transport security guidance requires Origin validation to mitigate DNS
 * rebinding attacks against localhost/private-network HTTP servers. Host header
 * validation is the primary protection: browsers cannot forge Host, so rebound
 * requests keep the attacker's hostname and are rejected before reaching /mcp.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { EnvConfig } from "../../config/env.js";
import type { Logger } from "../../observability/logger.js";

interface ParsedHost {
  hostname: string;
  port: string | undefined;
}

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "::1"] as const;

function splitCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function isWildcardBind(host: string): boolean {
  return host === "0.0.0.0" || host === "::" || host === "[::]" || host === "";
}

export function defaultAllowedHosts(env: EnvConfig): string[] {
  const hosts = new Set<string>(LOOPBACK_HOSTS);

  if (!isWildcardBind(env.HOST)) {
    hosts.add(env.HOST);
  }

  return [...hosts];
}

function stripIpv6Brackets(value: string): string {
  return value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
}

export function parseHost(value: string): ParsedHost | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[")) {
    const closeBracket = trimmed.indexOf("]");
    if (closeBracket === -1) return null;

    const hostname = trimmed.slice(1, closeBracket).toLowerCase();
    const rest = trimmed.slice(closeBracket + 1);
    const port = rest.startsWith(":") ? rest.slice(1) : undefined;
    return { hostname, port };
  }

  const colonCount = (trimmed.match(/:/g) ?? []).length;
  if (colonCount === 0) {
    return { hostname: stripIpv6Brackets(trimmed).toLowerCase(), port: undefined };
  }

  if (colonCount === 1) {
    const [hostname, port] = trimmed.split(":");
    if (!hostname) return null;
    return { hostname: hostname.toLowerCase(), port };
  }

  // Unbracketed IPv6 address without a port.
  return { hostname: trimmed.toLowerCase(), port: undefined };
}

function hostMatches(requestHost: ParsedHost, allowed: ParsedHost): boolean {
  if (requestHost.hostname !== allowed.hostname) return false;
  return allowed.port === undefined || requestHost.port === allowed.port;
}

export function allowedHosts(env: EnvConfig): ParsedHost[] {
  const configured = splitCsv(env.ALLOWED_HOSTS);
  const source = configured.length > 0 ? configured : defaultAllowedHosts(env);

  return source
    .map((entry) => parseHost(entry))
    .filter((entry): entry is ParsedHost => entry !== null);
}

export function allowedOrigins(env: EnvConfig): string[] {
  const configured = splitCsv(env.ALLOWED_ORIGINS);
  if (configured.length > 0) return configured.map((origin) => origin.toLowerCase());

  if (env.CORS_ORIGIN !== "*") {
    return splitCsv(env.CORS_ORIGIN).map((origin) => origin.toLowerCase());
  }

  return [];
}

export function isHostAllowed(hostHeader: string | undefined, env: EnvConfig): boolean {
  if (!hostHeader) return false;

  const requestHost = parseHost(hostHeader);
  if (!requestHost) return false;

  return allowedHosts(env).some((allowed) => hostMatches(requestHost, allowed));
}

export function isOriginAllowed(originHeader: string | undefined, env: EnvConfig): boolean {
  if (!originHeader) return true;

  const origins = allowedOrigins(env);
  if (origins.length === 0) {
    return env.NODE_ENV !== "production";
  }

  try {
    const origin = new URL(originHeader).origin.toLowerCase();
    return origins.includes(origin);
  } catch {
    return false;
  }
}

export function createHostOriginGuard(env: EnvConfig, logger: Logger): RequestHandler {
  const log = logger.child({ component: "host-origin-guard" });

  return (req: Request, res: Response, next: NextFunction): void => {
    const host = req.headers.host;
    const origin = req.headers.origin;

    if (!isHostAllowed(host, env)) {
      log.warn({ host, path: req.path, requestId: req.requestId }, "Rejected disallowed Host");
      res.status(403).json({
        error: "Forbidden",
        message: "Host is not allowed",
      });
      return;
    }

    if (!isOriginAllowed(origin, env)) {
      log.warn({ origin, path: req.path, requestId: req.requestId }, "Rejected disallowed Origin");
      res.status(403).json({
        error: "Forbidden",
        message: "Origin is not allowed",
      });
      return;
    }

    next();
  };
}
