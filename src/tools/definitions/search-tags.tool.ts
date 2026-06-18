import { structured, errorResponse } from "../../formatting/response.js";
import type { CatalogService } from "../../catalog/index.js";
import type { ToolDefinition } from "../tool.interface.js";
import {
  searchTagsInput,
  searchTagsOutput,
  type SearchTagsInput,
  type SearchTagsOutput,
} from "../schemas/tags.schema.js";

export function createSearchTagsTool(
  catalogService: CatalogService,
): ToolDefinition<typeof searchTagsInput, typeof searchTagsOutput> {
  return {
    name: "search_tags",
    title: "Search Tags",
    description:
      "Search topic tags by keyword — finds tags whose names contain the keyword. " +
      "Uses substring matching with trigram-fuzzy fallback for typos and partial words. " +
      "Each result includes related tags (co-occurring tags from the same datasets). " +
      "Useful when you have a concept and need the exact tag name to use in find_datasets(). " +
      "Results sorted by dataset count (most popular first). " +
      "Supports both Hebrew and English search terms.",
    inputSchema: searchTagsInput,
    outputSchema: searchTagsOutput,
    annotations: { readOnlyHint: true, idempotentHint: true, title: "Search Tags" },
    handler(input: SearchTagsInput) {
      try {
        const limit = input.limit ?? 30;
        const results = catalogService.searchTags(input.keyword, limit);

        const data: SearchTagsOutput = {
          keyword: input.keyword,
          results: results.map((r) => ({
            tag: r.name,
            count: r.count,
            related: catalogService.relatedTags(r.name, 5),
          })),
          total: results.length,
        };

        return Promise.resolve(structured(data));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return Promise.resolve(errorResponse(`Failed to search tags: ${msg}`));
      }
    },
  };
}
