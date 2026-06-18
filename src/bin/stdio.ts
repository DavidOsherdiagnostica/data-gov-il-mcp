/**
 * stdio entry point — for Claude Desktop and CLI MCP usage.
 * stdout is reserved exclusively for JSON-RPC messages.
 * All logging goes to stderr via pino.
 */
import "dotenv/config";
import { env } from "../config/env.js";
import { logger } from "../observability/logger.js";
import { buildContainer } from "../core/container.js";
import { createMcpServer } from "../core/server.js";
import { StdioTransport } from "../transports/stdio.transport.js";
import { registerLifecycle } from "../core/lifecycle.js";

const log = logger.child({ transport: "stdio" });

async function main(): Promise<void> {
  log.debug({ env: env.NODE_ENV }, "Starting stdio server");

  const container = buildContainer(env, logger);
  const server = createMcpServer(container, logger);
  const transport = new StdioTransport(logger);

  registerLifecycle(transport, logger);
  await transport.start(server);
}

main().catch((err: unknown) => {
  process.stderr.write(`[data-gov-il-mcp] Fatal startup error: ${String(err)}\n`);
  process.exit(1);
});
