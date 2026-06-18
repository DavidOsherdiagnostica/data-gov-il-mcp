import { formatSearchRecordsError } from "../../formatting/guidance.js";
import { structured, errorResponse } from "../../formatting/response.js";
import type { RecordsService } from "../../services/records.service.js";
import type { ToolDefinition } from "../tool.interface.js";
import {
  searchRecordsInput,
  searchRecordsOutput,
  type SearchRecordsInput,
  type SearchRecordsOutput,
} from "../schemas/search-records.schema.js";

export function createSearchRecordsTool(
  recordsService: RecordsService,
): ToolDefinition<typeof searchRecordsInput, typeof searchRecordsOutput> {
  return {
    name: "search_records",
    title: "Search Records",
    description:
      "Search and filter tabular data records within a specific CKAN datastore resource. " +
      "Supports full-text search, exact field filters, field selection, sorting, pagination, " +
      "and distinct value enumeration. The resource_id must come from a resource with " +
      "datastore_active=true (get it from list_resources). " +
      "This is the main data extraction tool — use it to retrieve actual government data records.",
    inputSchema: searchRecordsInput,
    outputSchema: searchRecordsOutput,
    annotations: { readOnlyHint: true, idempotentHint: true, title: "Search Records" },
    async handler(input: SearchRecordsInput) {
      try {
        const result = await recordsService.search({
          resourceId: input.resource_id,
          q: input.q ?? undefined,
          limit: input.limit,
          offset: input.offset,
          filters: input.filters ?? undefined,
          fields: input.fields ?? undefined,
          sort: input.sort ?? undefined,
          includeTotal: input.include_total ?? undefined,
          distinct: input.distinct ?? undefined,
        });

        const data: SearchRecordsOutput = {
          resource_id: input.resource_id,
          records: result.records,
          fields: result.fields.map((f) => ({ id: f.id, type: f.type })),
          total: result.total,
          limit: result.limit ?? input.limit,
          offset: result.offset ?? input.offset,
        };

        return structured(data);
      } catch (err: unknown) {
        return errorResponse(formatSearchRecordsError(err, input.resource_id));
      }
    },
  };
}
