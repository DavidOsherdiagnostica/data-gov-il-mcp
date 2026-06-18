/**
 * MCP server factory — creates and configures the McpServer.
 * Registers all capabilities (tools, resources, prompts).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { serverInfo } from "../config/server-info.js";
import { registerAllTools } from "../tools/register.js";
import { registerAllResources } from "../resources/register.js";
import { registerAllPrompts } from "../prompts/register.js";
import type { AppContainer } from "./container.js";
import type { Logger } from "../observability/logger.js";

export function createMcpServer(container: AppContainer, logger: Logger): McpServer {
  const log = logger.child({ component: "server" });

  log.info({ name: serverInfo.name, version: serverInfo.version }, "Creating MCP server");

  const server = new McpServer(
    {
      name: serverInfo.name,
      version: serverInfo.version,
      description: serverInfo.description,
    },
    {
      capabilities: {
        tools: {},
        resources: {
          subscribe: true,
          listChanged: true,
        },
        prompts: {},
      },
    },
  );

  registerAllTools(server, {
    datasetsService: container.datasetsService,
    organizationsService: container.organizationsService,
    resourcesService: container.resourcesService,
    recordsService: container.recordsService,
    catalogService: container.catalogService,
    features: container.features,
    logger,
  });

  registerAllResources(server, {
    datasetsService: container.datasetsService,
    organizationsService: container.organizationsService,
    catalogService: container.catalogService,
    logger,
  });

  registerAllPrompts(server, container.catalogService, logger);

  log.info("MCP server configured with tools, resources, and prompts");

  return server;
}
