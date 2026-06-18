/**
 * Transport abstraction — isolates stdio and HTTP implementations
 * from the server core.
 *
 * MIGRATION NOTE (spec 2026-07-28):
 * When the stateless spec lands, replace HttpTransport with a new
 * StatelessHttpTransport that drops session management entirely.
 * StdioTransport is unaffected by that spec change.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ITransport {
  /**
   * Connect the transport to the MCP server and start serving.
   * Resolves when the transport is ready to accept requests.
   */
  start(server: McpServer): Promise<void>;

  /**
   * Gracefully shut down the transport.
   * Implementations must close all active connections.
   */
  stop(): Promise<void>;
}
