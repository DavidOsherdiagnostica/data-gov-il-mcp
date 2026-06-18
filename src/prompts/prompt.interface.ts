/**
 * Typed contract for MCP Prompt definitions.
 * Prompts are user-controlled templates for structured LLM interactions.
 */

export interface PromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

export interface PromptDefinition {
  /** Prompt name (slug). */
  name: string;
  /** Short description shown in MCP clients. */
  description: string;
  /** Argument declarations — each argument is available during rendering. */
  arguments: PromptArgument[];
  /**
   * Handler that produces the prompt messages.
   * Receives validated args and returns the rendered prompt content.
   */
  handler: (args: Record<string, string>) => PromptResult;
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: { type: "text"; text: string };
}

export interface PromptResult {
  description?: string;
  messages: PromptMessage[];
}
