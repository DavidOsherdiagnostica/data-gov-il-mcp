import { structured, errorResponse } from "../../formatting/response.js";
import type { CatalogService } from "../../catalog/index.js";
import type { ToolDefinition } from "../tool.interface.js";
import {
  listAvailableTagsInput,
  listAvailableTagsOutput,
  type ListAvailableTagsInput,
  type ListAvailableTagsOutput,
} from "../schemas/tags.schema.js";

export function createListAvailableTagsTool(
  catalogService: CatalogService,
): ToolDefinition<typeof listAvailableTagsInput, typeof listAvailableTagsOutput> {
  return {
    name: "list_available_tags",
    title: "List Available Tags",
    description:
      "Browse topic tags available on data.gov.il, ranked by real dataset count. " +
      "Returns the most-used tags and optionally filters to tags co-occurring with a given topic. " +
      "Use this as your FIRST step for topic-based discovery — the returned tag names " +
      "can be passed directly to find_datasets(). " +
      "Use relatedTo to drill into a domain: e.g. relatedTo='תחבורה' returns all tags " +
      "frequently attached to transportation datasets.",
    inputSchema: listAvailableTagsInput,
    outputSchema: listAvailableTagsOutput,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "List Available Tags",
    },
    handler(input: ListAvailableTagsInput) {
      try {
        const limit = input.limit ?? 50;
        const stats = catalogService.stats();

        let tags;
        if (input.relatedTo) {
          const related = catalogService.relatedTags(input.relatedTo, limit);
          if (related.length === 0) {
            return Promise.resolve(
              errorResponse(
                `No co-occurring tags found for '${input.relatedTo}'. ` +
                  "Check the spelling or try a broader tag from list_available_tags().",
              ),
            );
          }
          tags = related.map(({ tag, count }) => ({ tag, count }));
        } else {
          tags = catalogService.rankedTags(limit).map((t) => ({ tag: t.name, count: t.count }));
        }

        const data: ListAvailableTagsOutput = {
          tags,
          popular: catalogService.rankedTags(10).map((t) => ({ tag: t.name, count: t.count })),
          total_tags: stats.tagCount,
          catalog_generated_at: stats.generatedAt,
        };

        return Promise.resolve(structured(data));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return Promise.resolve(errorResponse(`Failed to list tags: ${msg}`));
      }
    },
  };
}
