import type { ResourceDefinition, ResourceContent } from "../resource.interface.js";
import type { CatalogService } from "../../catalog/index.js";

export function createTagsCatalogResource(catalogService: CatalogService): ResourceDefinition {
  return {
    uri: "datagov://tags",
    name: "Tags Catalog",
    description:
      "Complete list of topic tags available on data.gov.il, ranked by real dataset count " +
      "from the committed catalog snapshot. Use these tag names in find_datasets() for " +
      "topic-based dataset discovery. Includes dataset counts and catalog metadata.",
    mimeType: "application/json",
    handler(): Promise<ResourceContent> {
      const stats = catalogService.stats();
      const tags = catalogService.rankedTags(500);

      return Promise.resolve({
        uri: "datagov://tags",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            catalog_generated_at: stats.generatedAt,
            total_tags: stats.tagCount,
            tags: tags.map((t) => ({ tag: t.name, count: t.count })),
          },
          null,
          2,
        ),
      });
    },
  };
}
