/**
 * Datasets domain service — search, list, and get dataset info.
 * Pure business logic, no MCP concepts.
 */
import type { CkanClient } from "../ckan/client.js";
import type { CkanDataset, PackageSearchResult } from "../ckan/types.js";
import { CKAN_ENDPOINTS } from "../ckan/endpoints.js";
import { SORT_OPTIONS, type SortOption } from "../config/constants.js";
import type { ICache } from "../cache/cache.interface.js";
import type { Logger } from "../observability/logger.js";

export interface DatasetSearchOptions {
  query: string;
  sort: SortOption | undefined;
  /** CKAN fq (filter query) tag expression */
  tags: string | undefined;
}

const CACHE_KEYS = {
  allDatasets: "datasets:all",
} as const;

/** TTL for the expensive "all datasets" list — 10 minutes. */
const ALL_DATASETS_TTL_MS = 10 * 60 * 1000;

export class DatasetsService {
  private readonly log: Logger;

  constructor(
    private readonly ckan: CkanClient,
    private readonly cache: ICache,
    logger: Logger,
  ) {
    this.log = logger.child({ component: "datasets-service" });
  }

  /**
   * Search datasets by query string, with optional sort and tag filter.
   * Implements the previously missing `tags` parameter from find_datasets.
   */
  async search(opts: DatasetSearchOptions): Promise<PackageSearchResult> {
    const params: Record<string, string> = {
      q: opts.query.trim(),
    };

    if (opts.sort !== undefined && SORT_OPTIONS[opts.sort]) {
      params["sort"] = SORT_OPTIONS[opts.sort];
    }

    // Build fq (filter query) for tags — CKAN tag syntax: tags:"tagname"
    if (opts.tags !== undefined && opts.tags.trim().length > 0) {
      params["fq"] = `tags:"${opts.tags.trim()}"`;
    }

    this.log.debug({ opts }, "Searching datasets");
    return this.ckan.get<PackageSearchResult>(CKAN_ENDPOINTS.PACKAGE_SEARCH, params);
  }

  /**
   * Get full metadata for a specific dataset by name or ID.
   */
  async getInfo(datasetId: string, includeTracking = false): Promise<CkanDataset> {
    const params: Record<string, string> = { id: datasetId };
    if (includeTracking) params["include_tracking"] = "true";

    this.log.debug({ datasetId, includeTracking }, "Fetching dataset info");
    return this.ckan.get<CkanDataset>(CKAN_ENDPOINTS.PACKAGE_SHOW, params);
  }

  /**
   * List all dataset names — expensive (~1170 items), cached for 10 minutes.
   */
  async listAll(): Promise<string[]> {
    return this.cache.getOrSet(CACHE_KEYS.allDatasets, ALL_DATASETS_TTL_MS, async () => {
      this.log.info("Fetching all datasets (expensive operation, will be cached)");
      return this.ckan.get<string[]>(CKAN_ENDPOINTS.PACKAGE_LIST);
    });
  }
}
