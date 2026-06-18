/**
 * Registers all MCP Resources using the registerResource API.
 * Static resources are directly accessible by URI.
 * Template resources accept URI parameters and support autocompletion.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CompleteResourceTemplateCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  ResourceDefinition,
  ResourceTemplateDefinition,
  ResourceContent,
} from "./resource.interface.js";
import { createOrganizationsResource } from "./definitions/organizations.resource.js";
import { createTagsCatalogResource } from "./definitions/tags-catalog.resource.js";
import { createDatasetResource } from "./definitions/dataset.resource.js";
import { createUsageGuideResource } from "./definitions/usage-guide.resource.js";
import { createFeaturedDatasetsResource } from "./definitions/featured-datasets.resource.js";
import { createCatalogStatsResource } from "./definitions/catalog-stats.resource.js";
import { registerResourceSubscriptions } from "./subscriptions.js";
import type { DatasetsService } from "../services/datasets.service.js";
import type { OrganizationsService } from "../services/organizations.service.js";
import type { CatalogService } from "../catalog/index.js";
import type { Logger } from "../observability/logger.js";

export interface ResourceRegistryDeps {
  datasetsService: DatasetsService;
  organizationsService: OrganizationsService;
  catalogService: CatalogService;
  logger: Logger;
}

function contentItem(content: ResourceContent) {
  return content.text !== undefined
    ? { uri: content.uri, text: content.text, mimeType: content.mimeType }
    : { uri: content.uri, blob: content.blob ?? "", mimeType: content.mimeType };
}

function registerStaticResource(
  server: McpServer,
  resource: ResourceDefinition,
  log: Logger,
): void {
  server.registerResource(
    resource.name,
    resource.uri,
    {
      description: resource.description,
      mimeType: resource.mimeType,
    },
    async (_uri) => {
      const content = await resource.handler();
      return { contents: [contentItem(content)] };
    },
  );
  log.debug({ uri: resource.uri }, "Registered static resource");
}

function registerTemplateResource(
  server: McpServer,
  tmpl: ResourceTemplateDefinition,
  log: Logger,
): void {
  // Build completion callbacks from the definitions (static arrays or dynamic functions).
  const complete: Record<string, CompleteResourceTemplateCallback> = {};
  for (const [variable, values] of Object.entries(tmpl.completions ?? {})) {
    if (typeof values === "function") {
      complete[variable] = values;
    } else {
      const list = values;
      complete[variable] = (partial) =>
        partial ? list.filter((v) => v.startsWith(partial)) : list;
    }
  }

  const listResources = tmpl.list;
  const rt = new ResourceTemplate(tmpl.uriTemplate, {
    // Expose curated concrete resources represented by this template.
    // The template itself can still resolve any valid URI directly.
    list: listResources
      ? async () => ({
          resources: await listResources(),
        })
      : undefined,
    ...(Object.keys(complete).length > 0 ? { complete } : {}),
  });

  server.registerResource(
    tmpl.name,
    rt,
    {
      description: tmpl.description,
      mimeType: tmpl.mimeType,
    },
    async (_uri, variables) => {
      const content = await tmpl.handler(variables as Record<string, string>);
      return { contents: [contentItem(content)] };
    },
  );
  log.debug({ uriTemplate: tmpl.uriTemplate }, "Registered template resource");
}

export function registerAllResources(server: McpServer, deps: ResourceRegistryDeps): void {
  const log = deps.logger.child({ component: "resources-registry" });

  const staticResources: ResourceDefinition[] = [
    createOrganizationsResource(deps.organizationsService),
    createTagsCatalogResource(deps.catalogService),
    createUsageGuideResource(),
    createFeaturedDatasetsResource(),
    createCatalogStatsResource(deps.catalogService),
  ];

  const templateResources: ResourceTemplateDefinition[] = [
    createDatasetResource(deps.datasetsService, deps.catalogService),
  ];

  registerResourceSubscriptions(server, {
    staticResources,
    templateResources,
    logger: deps.logger,
  });

  for (const resource of staticResources) {
    registerStaticResource(server, resource, log);
  }

  for (const tmpl of templateResources) {
    registerTemplateResource(server, tmpl, log);
  }

  log.info(
    { static: staticResources.length, templates: templateResources.length },
    "All resources registered",
  );
}
