/**
 * MCP response builders.
 * All tool handlers use these — ensuring consistent format across all tools.
 *
 * Every successful tool response returns:
 *   - `structuredContent`: the canonical data object matching the tool outputSchema
 *   - `content[0].text`: the same data as pretty-printed JSON (for clients that
 *     only display text content)
 *
 * Error responses also emit JSON so error parsing is predictable.
 */
import type { ToolResult } from "../tools/tool.interface.js";

/** Create a plain text response (non-data edge cases only). */
export function text(message: string): ToolResult<never> {
  return {
    content: [{ type: "text", text: message }],
  };
}

/** Create a JSON error response with isError=true. */
export function errorResponse(message: string): ToolResult<never> {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

/**
 * Create a structured response.
 * `content[0].text` is the JSON-serialized form of `data` — identical to
 * `structuredContent` — so both machine and text-only clients see the same data.
 */
export function structured<T>(data: T): ToolResult<T> {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

/**
 * Format a count summary line.
 * Kept as a utility; not used inside tool handlers (they return raw JSON).
 */
export function formatCount(found: number, total?: number): string {
  if (total !== undefined && total > found) {
    return `Found ${found} of ${total.toLocaleString()} total results.`;
  }
  return `Found ${found} result${found !== 1 ? "s" : ""}.`;
}
