import { ElicitResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { structured, errorResponse } from "../../formatting/response.js";
import type { DatasetsService } from "../../services/datasets.service.js";
import type { CatalogService } from "../../catalog/index.js";
import type { DatasetSummary } from "../../catalog/index.js";
import type { ToolDefinition, ToolHandlerContext } from "../tool.interface.js";
import {
  findDatasetsBaseInput,
  findDatasetsInteractiveInput,
  findDatasetsOutput,
  type FindDatasetsBaseInput,
  type FindDatasetsInput,
  type FindDatasetsOutput,
} from "../schemas/find-datasets.schema.js";

const INTERACTIVE_RESULT_THRESHOLD = 12;
const MAX_ORG_CHOICES = 6;
const ALL_ORGANIZATIONS_CHOICE = "__all__";

type InteractiveStatus = NonNullable<FindDatasetsOutput["interactive"]>;

function topOrganizations(results: DatasetSummary[]): string[] {
  const counts = new Map<string, number>();
  for (const result of results) {
    if (!result.org) continue;
    counts.set(result.org, (counts.get(result.org) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_ORG_CHOICES)
    .map(([org]) => org);
}

function selectedOrganization(content: unknown): string | undefined {
  if (content === null || typeof content !== "object") return undefined;
  const value = (content as Record<string, unknown>)["organization"];
  return typeof value === "string" ? value : undefined;
}

export function createFindDatasetsTool(
  datasetsService: DatasetsService,
  catalogService: CatalogService,
  options: { enableElicitation: boolean } = { enableElicitation: false },
): ToolDefinition<typeof findDatasetsBaseInput, typeof findDatasetsOutput> {
  const inputSchema = options.enableElicitation ? findDatasetsInteractiveInput : findDatasetsBaseInput;

  return {
    name: "find_datasets",
    title: "Find Datasets",
    description:
      "Search for datasets in the Israeli Government Open Data catalog (data.gov.il) by " +
      "keywords, topic names, or tags. Returns matching dataset names, titles, and metadata. " +
      "Use this as your primary discovery tool before accessing specific datasets. " +
      "Tip: combine with list_available_tags() to discover relevant topic keywords. " +
      (options.enableElicitation
        ? "When the user would benefit from a clarification step for a broad query, set interactive=true; supported clients may ask the user to narrow the result set. "
        : "") +
      "Use natural Hebrew or English search terms; avoid artificial identifiers, random " +
      "test strings, or symbol-heavy queries because CKAN may return noisy unrelated results.",
    inputSchema,
    outputSchema: findDatasetsOutput,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "Find Datasets",
    },
    async handler(input: FindDatasetsBaseInput, context: ToolHandlerContext) {
      try {
        const interactiveRequested =
          "interactive" in input && (input as FindDatasetsInput).interactive === true;
        const interactive: InteractiveStatus | undefined =
          options.enableElicitation && interactiveRequested
          ? {
              requested: true,
              available: Boolean(context.clientCapabilities?.elicitation),
              applied: false,
            }
          : undefined;

        // Catalog-first: fast in-memory search with fuzzy + co-occurrence ranking
        if (!catalogService.isEmpty()) {
          let catalogResults = catalogService.search(input.query, {
            tags: input.tags ?? undefined,
            limit: 20,
          });

          if (catalogResults.length > 0) {
            if (interactive) {
              const orgOptions = topOrganizations(catalogResults);

              if (!interactive.available) {
                interactive.reason = "client_does_not_support_elicitation";
              } else if (input.tags) {
                interactive.reason = "already_filtered_by_tags";
              } else if (catalogResults.length <= INTERACTIVE_RESULT_THRESHOLD) {
                interactive.reason = "result_count_below_threshold";
              } else if (orgOptions.length < 2) {
                interactive.reason = "not_enough_distinct_organizations";
              } else {
                try {
                  const elicitation = await context.request.sendRequest(
                    {
                      method: "elicitation/create",
                      params: {
                        mode: "form",
                        message:
                          `נמצאו ${catalogResults.length} datasets אפשריים עבור "${input.query}". ` +
                          "אפשר לצמצם לפי ארגון מפרסם, או להשאיר את כל התוצאות.",
                        requestedSchema: {
                          type: "object",
                          properties: {
                            organization: {
                              type: "string",
                              title: "Publisher organization",
                              description:
                                "Choose a publisher organization to narrow the dataset results, " +
                                "or keep all organizations.",
                              enum: [ALL_ORGANIZATIONS_CHOICE, ...orgOptions],
                            },
                          },
                          required: ["organization"],
                        },
                      },
                    },
                    ElicitResultSchema,
                    { signal: context.signal },
                  );

                  if (elicitation.action === "accept") {
                    const org = selectedOrganization(elicitation.content);
                    if (org && org !== ALL_ORGANIZATIONS_CHOICE) {
                      catalogResults = catalogResults.filter((ds) => ds.org === org);
                      interactive.applied = true;
                      interactive.selected_organization = org;
                    } else {
                      interactive.reason = "user_kept_all_organizations";
                    }
                  } else {
                    interactive.reason = `user_${elicitation.action}`;
                  }
                } catch (err: unknown) {
                  interactive.reason =
                    err instanceof Error ? `elicitation_failed: ${err.message}` : "elicitation_failed";
                }
              }
            }

            const data: FindDatasetsOutput = {
              count: catalogResults.length,
              results: catalogResults.map((ds) => ({
                name: ds.name,
                title: ds.title,
                notes: ds.notes.slice(0, 200) || undefined,
                organization: ds.org || undefined,
                metadata_modified: ds.modified,
                num_resources: ds.numResources,
              })),
              query: input.query,
              sort: input.sort,
              interactive,
            };
            return structured(data);
          }
        }

        // Live CKAN fallback: catches brand-new datasets not yet in the snapshot
        const result = await datasetsService.search({
          query: input.query,
          sort: input.sort ?? undefined,
          tags: input.tags ?? undefined,
        });

        const datasets = result.results ?? [];

        if (datasets.length === 0) {
          return errorResponse(
            `No datasets found for "${input.query}". ` +
              "Try different search terms, both Hebrew and English, " +
              "or use list_available_tags() to discover valid topic keywords.",
          );
        }

        const data: FindDatasetsOutput = {
          count: result.count,
          results: datasets.map((d) => ({
            name: d.name,
            title: d.title,
            notes: d.notes?.slice(0, 200),
            organization: d.organization?.name,
            metadata_modified: d.metadata_modified,
            num_resources: d.num_resources,
          })),
          query: input.query,
          sort: input.sort,
          interactive,
        };

        return structured(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(`Failed to search datasets: ${msg}`);
      }
    },
  };
}
