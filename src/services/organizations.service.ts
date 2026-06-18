/**
 * Organizations domain service.
 */
import type { CkanClient } from "../ckan/client.js";
import type { CkanOrganization } from "../ckan/types.js";
import { CKAN_ENDPOINTS } from "../ckan/endpoints.js";
import type { ICache } from "../cache/cache.interface.js";
import type { Logger } from "../observability/logger.js";

const CACHE_KEYS = {
  list: "organizations:list",
} as const;

/** Organizations list is fairly static — cache for 15 minutes. */
const ORG_LIST_TTL_MS = 15 * 60 * 1000;

export class OrganizationsService {
  private readonly log: Logger;

  constructor(
    private readonly ckan: CkanClient,
    private readonly cache: ICache,
    logger: Logger,
  ) {
    this.log = logger.child({ component: "organizations-service" });
  }

  /**
   * List all organization names — cached.
   */
  async list(): Promise<string[]> {
    return this.cache.getOrSet(CACHE_KEYS.list, ORG_LIST_TTL_MS, async () => {
      this.log.debug("Fetching organizations list");
      return this.ckan.get<string[]>(CKAN_ENDPOINTS.ORGANIZATION_LIST);
    });
  }

  /**
   * Get full metadata for a specific organization.
   */
  async getInfo(orgName: string): Promise<CkanOrganization> {
    this.log.debug({ orgName }, "Fetching organization info");
    return this.ckan.get<CkanOrganization>(CKAN_ENDPOINTS.ORGANIZATION_SHOW, {
      id: orgName,
    });
  }
}
