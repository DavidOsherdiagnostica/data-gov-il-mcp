import { structured, errorResponse } from "../../formatting/response.js";
import type { DatasetsService } from "../../services/datasets.service.js";
import type { ToolDefinition } from "../tool.interface.js";
import {
  getDatasetInfoInput,
  getDatasetInfoOutput,
  type GetDatasetInfoInput,
  type GetDatasetInfoOutput,
} from "../schemas/get-dataset-info.schema.js";

export function createGetDatasetInfoTool(
  datasetsService: DatasetsService,
): ToolDefinition<typeof getDatasetInfoInput, typeof getDatasetInfoOutput> {
  return {
    name: "get_dataset_info",
    title: "Get Dataset Info",
    description:
      "Get comprehensive metadata for a specific dataset: title, description, organization, " +
      "tags, number of resources, creation/modification dates, license, and full resource list " +
      "with their IDs and datastore_active status. Use this before list_resources to " +
      "understand a dataset's structure. The resource IDs from this tool can be used " +
      "directly with search_records.",
    inputSchema: getDatasetInfoInput,
    outputSchema: getDatasetInfoOutput,
    annotations: { readOnlyHint: true, idempotentHint: true, title: "Get Dataset Info" },
    async handler(input: GetDatasetInfoInput) {
      try {
        const d = await datasetsService.getInfo(input.dataset, input.include_tracking ?? false);

        const data: GetDatasetInfoOutput = {
          id: d.id,
          name: d.name,
          title: d.title,
          notes: d.notes ?? undefined,
          organization: d.organization?.title ?? d.organization?.name ?? undefined,
          num_resources: d.num_resources,
          num_tags: d.num_tags,
          tags: d.tags.map((t) => t.name),
          metadata_created: d.metadata_created,
          metadata_modified: d.metadata_modified,
          license: d.license_title ?? d.license_id ?? undefined,
          resources: d.resources.map((r) => ({
            id: r.id,
            name: r.name,
            format: r.format,
            datastore_active: r.datastore_active,
            description: r.description ?? undefined,
          })),
        };

        return structured(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(`Failed to get info for dataset '${input.dataset}': ${msg}`);
      }
    },
  };
}
