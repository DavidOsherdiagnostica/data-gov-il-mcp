/**
 * Resources domain service — lists CKAN resources within a dataset.
 * Note: "resources" here refers to CKAN resources (files/datastores),
 * not MCP Resources (those are in src/resources/).
 */
import type { CkanClient } from "../ckan/client.js";
import type { CkanDataset, CkanResource } from "../ckan/types.js";
import { CKAN_ENDPOINTS } from "../ckan/endpoints.js";
import type { Logger } from "../observability/logger.js";

export interface ResourceListOptions {
  datasetId: string;
  includeTracking: boolean | undefined;
}

export class ResourcesService {
  private readonly log: Logger;

  constructor(
    private readonly ckan: CkanClient,
    logger: Logger,
  ) {
    this.log = logger.child({ component: "resources-service" });
  }

  /**
   * List all resources (files/datastores) within a dataset.
   */
  async listForDataset(opts: ResourceListOptions): Promise<CkanResource[]> {
    const params: Record<string, string> = { id: opts.datasetId };
    if (opts.includeTracking === true) params["include_tracking"] = "true";

    this.log.debug({ datasetId: opts.datasetId }, "Fetching dataset resources");
    const dataset = await this.ckan.get<CkanDataset>(CKAN_ENDPOINTS.PACKAGE_SHOW, params);
    return dataset.resources;
  }
}
