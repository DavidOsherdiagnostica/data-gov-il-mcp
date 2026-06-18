/**
 * Registers all MCP tools with the server.
 *
 * All tool handler logic is fully typed. The two targeted casts in
 * registerOneTool are an unavoidable SDK boundary:
 *   1. `args as z.infer<typeof tool.inputSchema>` — generic type erasure recovery
 *   2. `as unknown as Promise<CallToolResult>` — our ToolResult<T> is structurally
 *      identical to CallToolResult; SDK content[] accepts text-only items
 *
 * This replaces the former ~10 scattered eslint-disable-next-line comments.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ZodObject, ZodRawShape, z } from "zod";
import { createFindDatasetsTool } from "./definitions/find-datasets.tool.js";
import { createGetDatasetInfoTool } from "./definitions/get-dataset-info.tool.js";
import { createListAllDatasetsTool } from "./definitions/list-all-datasets.tool.js";
import { createListResourcesTool } from "./definitions/list-resources.tool.js";
import { createSearchRecordsTool } from "./definitions/search-records.tool.js";
import { createListOrganizationsTool } from "./definitions/list-organizations.tool.js";
import { createGetOrganizationInfoTool } from "./definitions/get-organization-info.tool.js";
import { createListAvailableTagsTool } from "./definitions/list-available-tags.tool.js";
import { createSearchTagsTool } from "./definitions/search-tags.tool.js";
import { createSummarizeDatasetTool } from "./definitions/summarize-dataset.tool.js";
import type { DatasetsService } from "../services/datasets.service.js";
import type { OrganizationsService } from "../services/organizations.service.js";
import type { ResourcesService } from "../services/resources.service.js";
import type { RecordsService } from "../services/records.service.js";
import type { CatalogService } from "../catalog/index.js";
import type { Logger } from "../observability/logger.js";
import type { McpFeatureFlags } from "../core/container.js";
import type { ToolDefinition } from "./tool.interface.js";

export interface ToolRegistryDeps {
  datasetsService: DatasetsService;
  organizationsService: OrganizationsService;
  resourcesService: ResourcesService;
  recordsService: RecordsService;
  catalogService: CatalogService;
  features: McpFeatureFlags;
  logger: Logger;
}

/** Type-erased ToolDefinition for array storage — generics recovered in registerOneTool. */
type AnyToolDef = ToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>;

function registerOneTool(server: McpServer, tool: AnyToolDef, log: Logger): void {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      annotations: tool.annotations,
      // inputSchema receives the raw ZodRawShape so the SDK can build JSON Schema
      inputSchema: tool.inputSchema.shape,
      // outputSchema as AnySchema (ZodObject satisfies this directly)
      outputSchema: tool.outputSchema,
    },
    (args, extra) =>
      // Cast 1: args type is erased to Record<string,unknown> at the boundary
      // Cast 2: ToolResult<T> is structurally a CallToolResult
      tool.handler(args as z.infer<typeof tool.inputSchema>, {
        server,
        clientCapabilities: server.server.getClientCapabilities(),
        request: extra,
        signal: extra.signal,
      }) as unknown as Promise<CallToolResult>,
  );
  log.debug({ tool: tool.name }, "Registered tool");
}

export function registerAllTools(server: McpServer, deps: ToolRegistryDeps): void {
  const log = deps.logger.child({ component: "tools-registry" });

  // Cast the array once: each specific ToolDefinition<T,O> erases to AnyToolDef.
  // Type safety is recovered per-tool inside registerOneTool.
  const tools: AnyToolDef[] = [
    createFindDatasetsTool(deps.datasetsService, deps.catalogService, {
      enableElicitation: deps.features.elicitation,
    }),
    createGetDatasetInfoTool(deps.datasetsService),
    createListAllDatasetsTool(deps.catalogService),
    createListResourcesTool(deps.resourcesService),
    createSearchRecordsTool(deps.recordsService),
    createListOrganizationsTool(deps.catalogService),
    createGetOrganizationInfoTool(deps.organizationsService),
    createListAvailableTagsTool(deps.catalogService),
    createSearchTagsTool(deps.catalogService),
    ...(deps.features.sampling ? [createSummarizeDatasetTool(deps.datasetsService)] : []),
  ] as AnyToolDef[];

  for (const tool of tools) {
    registerOneTool(server, tool, log);
  }

  log.info({ count: tools.length }, "All tools registered");
}
