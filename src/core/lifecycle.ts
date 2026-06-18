/**
 * Graceful shutdown manager.
 * Registers signal handlers (SIGINT, SIGTERM) and uncaughtException handler.
 */
import type { ITransport } from "../transports/transport.interface.js";
import type { Logger } from "../observability/logger.js";

export function registerLifecycle(transport: ITransport, logger: Logger): void {
  const log = logger.child({ component: "lifecycle" });

  async function shutdown(signal: string): Promise<never> {
    log.info({ signal }, "Shutdown signal received");
    try {
      await transport.stop();
      log.info("Clean shutdown complete");
    } catch (err: unknown) {
      log.error({ err }, "Error during shutdown");
    }
    process.exit(0);
  }

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("uncaughtException", (err: Error) => {
    log.fatal({ err }, "Uncaught exception");
    void transport.stop().finally(() => process.exit(1));
  });

  process.on("unhandledRejection", (reason: unknown) => {
    log.error({ reason }, "Unhandled promise rejection");
  });
}
