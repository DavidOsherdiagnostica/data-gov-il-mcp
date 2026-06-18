import type { ResourceDefinition, ResourceContent } from "../resource.interface.js";
import type { CatalogService } from "../../catalog/index.js";

export function createCatalogStatsResource(catalogService: CatalogService): ResourceDefinition {
  return {
    uri: "datagov://catalog/stats",
    name: "Catalog Statistics",
    description:
      "Metadata and statistics for the committed data.gov.il catalog snapshot. " +
      "Shows dataset count, tag count, organization count, and when the snapshot was generated. " +
      "Use this to understand the scope and freshness of the local discovery index.",
    mimeType: "application/json",
    handler(): Promise<ResourceContent> {
      const meta = catalogService.stats();
      const orgs = catalogService.organizations(10);

      return Promise.resolve({
        uri: "datagov://catalog/stats",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            schema_version: meta.schemaVersion,
            generated_at: meta.generatedAt,
            ckan_base_url: meta.ckanBaseUrl,
            dataset_count: meta.datasetCount,
            tag_count: meta.tagCount,
            org_count: meta.orgCount,
            top_organizations: orgs.map((o) => ({
              name: o.name,
              title: o.title,
              dataset_count: o.count,
            })),
          },
          null,
          2,
        ),
      });
    },
  };
}
