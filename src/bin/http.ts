/**
 * HTTP entry point — for remote/web MCP usage via Streamable HTTP transport.
 * Supports optional auth (API-Key or OAuth 2.1) via AUTH_MODE env.
 */
import "dotenv/config";
import { env } from "../config/env.js";
import { logger } from "../observability/logger.js";
import { buildContainer } from "../core/container.js";
import { createMcpServer } from "../core/server.js";
import { HttpTransport } from "../transports/http.transport.js";
import { createAuthProvider } from "../auth/auth.factory.js";
import { createAuthMiddleware } from "../auth/express-middleware.js";
import { registerLifecycle } from "../core/lifecycle.js";

const log = logger.child({ transport: "http" });

async function main(): Promise<void> {
  log.info({ port: env.PORT, host: env.HOST, authMode: env.AUTH_MODE }, "Starting HTTP server");

  const container = buildContainer(env, logger);
  const server = createMcpServer(container, logger);

  // Build auth middleware only when auth is enabled
  let authMiddleware: import("express").RequestHandler | undefined;
  if (env.AUTH_MODE !== "none") {
    const authProvider = createAuthProvider(env);
    authMiddleware = createAuthMiddleware(authProvider, logger, env);
    log.info({ mode: env.AUTH_MODE }, "Auth middleware enabled");
  }

  const transportOpts =
    authMiddleware !== undefined ? { env, logger, authMiddleware } : { env, logger };

  const transport = new HttpTransport(transportOpts);

  registerLifecycle(transport, logger);
  await transport.start(server);
}

main().catch((err: unknown) => {
  process.stderr.write(`[data-gov-il-mcp] Fatal startup error: ${String(err)}\n`);
  process.exit(1);
});
