/**
 * Public API barrel — for programmatic usage (not CLI entry points).
 * Import from here when using data-gov-il-mcp as a library.
 */
export { buildContainer } from "./core/container.js";
export { createMcpServer } from "./core/server.js";
export { StdioTransport } from "./transports/stdio.transport.js";
export { HttpTransport } from "./transports/http.transport.js";
export { CkanClient } from "./ckan/client.js";
export { CkanError } from "./ckan/errors.js";
export { MemoryCache } from "./cache/memory-cache.js";
export type * from "./ckan/types.js";
export type { AppContainer } from "./core/container.js";
export type { ITransport } from "./transports/transport.interface.js";
export type { IAuthProvider, AuthContext } from "./auth/auth.interface.js";
