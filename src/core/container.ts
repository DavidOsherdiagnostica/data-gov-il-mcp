/**
 * Composition root — builds and wires all dependencies.
 * This is the only place where concrete classes are instantiated.
 * Everything else works through interfaces.
 */
import { CkanClient } from "../ckan/client.js";
import { MemoryCache } from "../cache/memory-cache.js";
import { DatasetsService } from "../services/datasets.service.js";
import { OrganizationsService } from "../services/organizations.service.js";
import { ResourcesService } from "../services/resources.service.js";
import { RecordsService } from "../services/records.service.js";
import { CatalogService, catalogSnapshot } from "../catalog/index.js";
import type { EnvConfig } from "../config/env.js";
import { USER_AGENT } from "../config/constants.js";
import type { Logger } from "../observability/logger.js";

export interface McpFeatureFlags {
  elicitation: boolean;
  sampling: boolean;
}

export interface AppContainer {
  datasetsService: DatasetsService;
  organizationsService: OrganizationsService;
  resourcesService: ResourcesService;
  recordsService: RecordsService;
  catalogService: CatalogService;
  cache: MemoryCache;
  features: McpFeatureFlags;
}

export function buildContainer(env: EnvConfig, logger: Logger): AppContainer {
  const log = logger.child({ component: "container" });

  log.debug("Building dependency container");

  const cache = new MemoryCache({
    defaultTtlMs: env.CACHE_TTL_MS,
    maxItems: env.CACHE_MAX_ITEMS,
  });

  const ckan = new CkanClient({
    baseUrl: env.CKAN_BASE_URL,
    defaultTimeoutMs: env.CKAN_TIMEOUT_MS,
    searchTimeoutMs: env.CKAN_SEARCH_TIMEOUT_MS,
    userAgent: USER_AGENT,
    logger,
  });

  const datasetsService = new DatasetsService(ckan, cache, logger);
  const organizationsService = new OrganizationsService(ckan, cache, logger);
  const resourcesService = new ResourcesService(ckan, logger);
  const recordsService = new RecordsService(ckan, logger);
  const catalogService = new CatalogService(catalogSnapshot);
  const features: McpFeatureFlags = {
    elicitation: env.MCP_ENABLE_ELICITATION,
    sampling: env.MCP_ENABLE_SAMPLING,
  };

  log.debug(
    {
      catalogDatasets: catalogSnapshot.meta.datasetCount,
      catalogTags: catalogSnapshot.meta.tagCount,
      catalogGeneratedAt: catalogSnapshot.meta.generatedAt,
      features,
    },
    "Dependency container built",
  );

  return {
    datasetsService,
    organizationsService,
    resourcesService,
    recordsService,
    catalogService,
    cache,
    features,
  };
}
