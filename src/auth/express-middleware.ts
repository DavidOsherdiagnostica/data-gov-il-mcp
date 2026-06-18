/**
 * Express middleware that bridges IAuthProvider to HTTP routes.
 * Returns 401 with WWW-Authenticate header on failure.
 */
import type { Request, Response, NextFunction } from "express";
import type { IAuthProvider } from "./auth.interface.js";
import { oauthWwwAuthenticateHeader } from "./well-known.js";
import type { EnvConfig } from "../config/env.js";
import type { Logger } from "../observability/logger.js";

function wwwAuthenticateHeader(
  req: Request,
  env: EnvConfig | undefined,
  invalidToken = false,
): string {
  if (env?.AUTH_MODE === "oauth") {
    return oauthWwwAuthenticateHeader(req, env, invalidToken ? "invalid_token" : undefined);
  }

  return invalidToken
    ? 'Bearer realm="data-gov-il-mcp", error="invalid_token"'
    : 'Bearer realm="data-gov-il-mcp"';
}

export function createAuthMiddleware(
  provider: IAuthProvider,
  logger: Logger,
  env?: EnvConfig,
): (req: Request, res: Response, next: NextFunction) => void {
  const log = logger.child({ component: "auth-middleware" });

  return (req: Request, res: Response, next: NextFunction): void => {
    provider.authenticate(req).then(
      (ctx) => {
        if (ctx === null) {
          log.debug({ path: req.path }, "Unauthenticated request");
          res.setHeader("WWW-Authenticate", wwwAuthenticateHeader(req, env));
          res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
          return;
        }
        log.debug({ subject: ctx.subject, path: req.path }, "Authenticated request");
        next();
      },
      (err: unknown) => {
        log.warn({ err }, "Authentication error");
        res.setHeader("WWW-Authenticate", wwwAuthenticateHeader(req, env, true));
        res.status(401).json({
          error: "Unauthorized",
          message: err instanceof Error ? err.message : "Authentication failed",
        });
      },
    );
  };
}
