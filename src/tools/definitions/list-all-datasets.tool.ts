import { structured, errorResponse } from "../../formatting/response.js";
import type { CatalogService } from "../../catalog/index.js";
import type { ToolDefinition } from "../tool.interface.js";
import {
  listAllDatasetsInput,
  listAllDatasetsOutput,
  type ListAllDatasetsInput,
  type ListAllDatasetsOutput,
} from "../schemas/list-all-datasets.schema.js";

export function createListAllDatasetsTool(
  catalogService: CatalogService,
): ToolDefinition<typeof listAllDatasetsInput, typeof listAllDatasetsOutput> {
  return {
    name: "list_all_datasets",
    title: "List All Datasets",
    description:
      "Returns all dataset summaries from the local catalog index — name, title, organization, " +
      "and resource count. Instant (no network call). " +
      "Use the optional org filter to scope to a single publisher. " +
      "For keyword search use find_datasets() instead; for full metadata use get_dataset_info().",
    inputSchema: listAllDatasetsInput,
    outputSchema: listAllDatasetsOutput,
    annotations: { readOnlyHint: true, idempotentHint: true, title: "List All Datasets" },
    handler(input: ListAllDatasetsInput) {
      try {
        const all = catalogService.allDatasets(input.org ?? undefined);
        const limited = input.limit !== undefined ? all.slice(0, input.limit) : all;
        const stats = catalogService.stats();

        const data: ListAllDatasetsOutput = {
          total: all.length,
          datasets: limited.map((ds) => ({
            name: ds.name,
            title: ds.title,
            org: ds.org,
            num_resources: ds.numResources,
          })),
          truncated: limited.length < all.length,
          catalog_generated_at: stats.generatedAt,
        };

        return Promise.resolve(structured(data));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return Promise.resolve(errorResponse(`Failed to list datasets: ${msg}`));
      }
    },
  };
}
