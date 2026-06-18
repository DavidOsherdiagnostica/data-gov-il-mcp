import { structured, errorResponse } from "../../formatting/response.js";
import type { ResourcesService } from "../../services/resources.service.js";
import type { ToolDefinition } from "../tool.interface.js";
import {
  listResourcesInput,
  listResourcesOutput,
  type ListResourcesInput,
  type ListResourcesOutput,
} from "../schemas/list-resources.schema.js";

export function createListResourcesTool(
  resourcesService: ResourcesService,
): ToolDefinition<typeof listResourcesInput, typeof listResourcesOutput> {
  return {
    name: "list_resources",
    title: "List Dataset Resources",
    description:
      "List all files and datastores (resources) within a specific dataset. " +
      "Returns resource IDs, formats, and datastore_active status. " +
      "Resources with datastore_active=true can be queried with search_records. " +
      "Before sort/filters on records, probe search_records (limit=1) to discover exact field IDs. " +
      "This is the essential step between finding a dataset and querying its data.",
    inputSchema: listResourcesInput,
    outputSchema: listResourcesOutput,
    annotations: { readOnlyHint: true, idempotentHint: true, title: "List Dataset Resources" },
    async handler(input: ListResourcesInput) {
      try {
        const resources = await resourcesService.listForDataset({
          datasetId: input.dataset,
          includeTracking: input.include_tracking ?? undefined,
        });

        const activeResources = resources.filter((r) => r.datastore_active);

        const data: ListResourcesOutput = {
          dataset: input.dataset,
          total_resources: resources.length,
          datastore_active_count: activeResources.length,
          resources: resources.map((r) => ({
            id: r.id,
            name: r.name,
            format: r.format,
            datastore_active: r.datastore_active,
            description: r.description ?? undefined,
            url: r.url,
            size: r.size,
            last_modified: r.last_modified,
          })),
        };

        return structured(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(`Failed to list resources for dataset '${input.dataset}': ${msg}`);
      }
    },
  };
}
