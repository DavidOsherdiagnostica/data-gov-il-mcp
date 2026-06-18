/**
 * Structured logger — always writes to stderr.
 *
 * CRITICAL for MCP stdio mode: stdout is reserved exclusively for JSON-RPC
 * messages. Any log written to stdout corrupts the protocol stream.
 * Pino is directed to process.stderr unconditionally.
 */
import pino, { type Logger } from "pino";
import { env, isDevelopment } from "../config/env.js";

const transport =
  isDevelopment || env.NODE_ENV === "test"
    ? pino.transport({
        target: "pino-pretty",
        options: {
          destination: 2, // fd 2 = stderr
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      })
    : pino.destination({ dest: 2, sync: false }); // fd 2 = stderr, async

export const logger: Logger = pino(
  {
    level: env.LOG_LEVEL,
    base: null, // omit pid/hostname in structured logs
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport,
);

/**
 * Create a child logger scoped to a specific component.
 * Use this in each module for structured context:
 *
 *   const log = createLogger("ckan-client");
 *   log.debug({ endpoint, params }, "API request");
 */
export function createLogger(component: string): Logger {
  return logger.child({ component });
}

export type { Logger };
