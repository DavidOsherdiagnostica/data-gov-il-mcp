/**
 * Server identity — read from package.json at import time.
 * Solves the version-drift problem where four different version strings
 * existed across package.json, server.js, http.js, and health endpoints.
 */
import { createRequire } from "node:module";
import { env } from "./env.js";

const require = createRequire(import.meta.url);

interface PackageJson {
  name: string;
  version: string;
  description: string;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pkg: PackageJson = require("../../package.json");

/**
 * Semantic description sent to MCP clients (LLMs) via the protocol.
 * This is NOT a project blurb — it tells the model what data and capabilities
 * are available so it can plan tool usage effectively.
 */
const SERVER_DESCRIPTION =
  "Access to the Israeli Government Open Data portal (data.gov.il) — over 3,000 public " +
  "datasets published by government ministries, municipalities, and state agencies. " +
  "Data spans health, transportation, environment, finance, education, demographics, real estate, and more. " +
  "All data is in Hebrew; some datasets also have English metadata. " +
  "Available capabilities: search datasets by keyword or topic tag, inspect dataset metadata and resources, " +
  "query tabular records with filters and sorting, browse organizations, and explore the tag taxonomy. " +
  "Start with find_datasets() or list_available_tags() to discover relevant data.";

export const serverInfo = {
  /** MCP server name — overridable via SERVICE_NAME env. */
  name: env.SERVICE_NAME ?? "data-gov-il",
  /** MCP server version — always matches package.json unless overridden. */
  version: env.SERVICE_VERSION ?? pkg.version,
  /** Semantic description for MCP clients. */
  description: SERVER_DESCRIPTION,
} as const;

export type ServerInfo = typeof serverInfo;
