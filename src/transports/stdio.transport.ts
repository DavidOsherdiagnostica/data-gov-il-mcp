/**
 * stdio transport — for Claude Desktop and CLI usage.
 * stdin/stdout reserved for JSON-RPC; all logging goes to stderr.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ITransport } from "./transport.interface.js";
import type { Logger } from "../observability/logger.js";

export class StdioTransport implements ITransport {
  private transport?: StdioServerTransport;

  constructor(private readonly logger: Logger) {}

  async start(server: McpServer): Promise<void> {
    this.transport = new StdioServerTransport();
    this.logger.info("Starting stdio transport");
    await server.connect(this.transport);
    this.logger.info("stdio transport connected — ready for requests");
  }

  async stop(): Promise<void> {
    await this.transport?.close();
    this.logger.info("stdio transport closed");
  }
}
