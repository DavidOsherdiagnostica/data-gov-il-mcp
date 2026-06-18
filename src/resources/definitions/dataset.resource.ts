import type { ResourceTemplateDefinition, ResourceContent } from "../resource.interface.js";
import type { DatasetsService } from "../../services/datasets.service.js";
import type { CatalogService } from "../../catalog/index.js";

export function createDatasetResource(
  datasetsService: DatasetsService,
  catalogService: CatalogService,
): ResourceTemplateDefinition {
  return {
    uriTemplate: "datagov://dataset/{id}",
    name: "Dataset Metadata",
    description:
      "Full metadata for a specific dataset by name or ID. " +
      "Returns title, description, tags, organization, and full resource list with IDs. " +
      "URI example: datagov://dataset/branches. " +
      "The listing exposes curated datasets from the catalog; any valid dataset slug works.",
    mimeType: "application/json",
    completions: {
      id: (partial: string) => catalogService.completeDatasetName(partial, 15),
    },
    list(): Promise<ReturnType<typeof catalogService.listDatasetResources>> {
      return Promise.resolve(catalogService.listDatasetResources(50));
    },
    async handler(params: Record<string, string>): Promise<ResourceContent> {
      const id = params["id"];
      if (!id) throw new Error("Dataset ID is required");

      const dataset = await datasetsService.getInfo(id);
      return {
        uri: `datagov://dataset/${id}`,
        mimeType: "application/json",
        text: JSON.stringify(dataset, null, 2),
      };
    },
  };
}
