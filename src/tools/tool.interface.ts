/**
 * Typed contract for all MCP tool definitions.
 * Every tool must satisfy ToolDefinition<TInput, TOutput>.
 */
import type { ZodType, z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ClientCapabilities,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";

export interface ToolContext {
  server: McpServer;
}

export interface ToolHandlerContext {
  server: McpServer;
  clientCapabilities: ClientCapabilities | undefined;
  request: RequestHandlerExtra<ServerRequest, ServerNotification>;
  signal: AbortSignal;
}

export interface ToolAnnotations {
  /** Tool only reads data, never modifies state. */
  readOnlyHint?: boolean;
  /** Tool produces the same result for the same inputs. */
  idempotentHint?: boolean;
  /** Tool may interact with external systems. */
  openWorldHint?: boolean;
  /** Human-readable title for UI display. */
  title?: string;
}

export interface ToolDefinition<
  TInput extends ZodType,
  TOutput extends ZodType,
> {
  /** Tool name (snake_case, matches MCP protocol). */
  name: string;
  /** Short human-readable title (shown in MCP clients). */
  title: string;
  /** Detailed description explaining when/how to use this tool. Reaches the LLM. */
  description: string;
  /** Zod schema for input validation — exposed to the LLM as JSON Schema. */
  inputSchema: TInput;
  /** Zod schema for output validation — enables structuredContent. */
  outputSchema: TOutput;
  /** MCP tool annotations. */
  annotations?: ToolAnnotations;
  /**
   * The tool handler. Receives validated input and returns MCP content.
   * The return type must include `structuredContent` matching outputSchema.
   */
  handler: (
    input: z.infer<TInput>,
    context: ToolHandlerContext,
  ) => Promise<ToolResult<z.infer<TOutput>>>;
}

export interface ToolResult<T = unknown> {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: T;
  isError?: boolean;
}
