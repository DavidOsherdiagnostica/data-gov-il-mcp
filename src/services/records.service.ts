/**
 * Records domain service — searches tabular data via CKAN datastore.
 */
import type { CkanClient } from "../ckan/client.js";
import type { DatastoreSearchResult, DatastoreSearchParams } from "../ckan/types.js";
import type { Logger } from "../observability/logger.js";

export interface RecordSearchOptions {
  resourceId: string;
  q: string | undefined;
  limit: number | undefined;
  offset: number | undefined;
  /** Key-value exact filters. Arrays treated as OR. */
  filters: Record<string, unknown> | undefined;
  /** Field names to return. */
  fields: string[] | undefined;
  /** Sort expressions: ["field asc", "field2 desc"] */
  sort: string[] | undefined;
  includeTotal: boolean | undefined;
  /** Return unique values for a single field. */
  distinct: string | undefined;
}

export class RecordsService {
  private readonly log: Logger;

  constructor(
    private readonly ckan: CkanClient,
    logger: Logger,
  ) {
    this.log = logger.child({ component: "records-service" });
  }

  async search(opts: RecordSearchOptions): Promise<DatastoreSearchResult> {
    const params: DatastoreSearchParams = {
      resource_id: opts.resourceId,
      limit: opts.limit ?? 10,
      offset: opts.offset ?? 0,
    };

    if (opts.q?.trim()) params.q = opts.q.trim();

    if (opts.filters && Object.keys(opts.filters).length > 0) {
      params.filters = JSON.stringify(opts.filters);
    }

    if (opts.fields && opts.fields.length > 0) {
      params.fields = opts.fields.join(",");
    }

    if (opts.sort && opts.sort.length > 0) {
      params.sort = opts.sort.join(",");
    }

    if (opts.includeTotal) params.include_total = "true";

    if (opts.distinct?.trim()) params.distinct = opts.distinct.trim();

    this.log.debug({ resourceId: opts.resourceId, limit: params.limit }, "Searching records");
    return this.ckan.datastoreSearch(params);
  }
}
