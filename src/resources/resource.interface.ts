/**
 * Typed contract for MCP Resource definitions.
 * Resources are application-controlled, read-only data endpoints.
 */

export interface ResourceDefinition {
  /** Full URI, e.g. "datagov://organizations" */
  uri: string;
  /** Human-readable display name. */
  name: string;
  /** Description of what this resource contains. */
  description?: string;
  /** MIME type of the returned content. */
  mimeType?: string;
  /**
   * Handler that returns the resource content.
   * Returns either text or blob content.
   */
  handler: () => Promise<ResourceContent>;
}

export interface ResourceTemplateDefinition {
  /** URI template with {param} placeholders, e.g. "datagov://dataset/{id}" */
  uriTemplate: string;
  /** Human-readable display name. */
  name: string;
  /** Description of what this resource contains. */
  description?: string;
  /** MIME type of the returned content. */
  mimeType?: string;
  /**
   * Handler receiving the extracted template variables.
   * e.g. for "datagov://dataset/{id}" → receives { id: "some-dataset" }
   */
  handler: (params: Record<string, string>) => Promise<ResourceContent>;
  /**
   * Optional list of concrete resources represented by this template.
   * Keep this curated; the template itself can still resolve any valid URI.
   */
  list?: () => Promise<ResourceListItem[]>;
  /**
   * Optional completions for template variables.
   * Each value can be a static array or a function called with the current partial input.
   */
  completions?: Record<string, string[] | ((partial: string) => string[])>;
}

export interface ResourceListItem {
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string; // base64-encoded
}
