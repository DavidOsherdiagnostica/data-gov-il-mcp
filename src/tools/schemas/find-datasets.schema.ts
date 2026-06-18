import { z } from "zod";

export const findDatasetsBaseInput = z.object({
  query: z
    .string()
    .min(1, "Search query must not be empty")
    .describe(
      "Natural-language search terms in Hebrew or English. Prefer real topic words, " +
        "domain phrases, dataset titles, organization names, or tags from list_available_tags(). " +
        "Avoid artificial test strings, random identifiers, long symbol-heavy text, or " +
        "underscore-heavy values; CKAN search may return noisy unrelated results for those. " +
        "Examples: 'תקציב', 'תחבורה ציבורית', 'איכות אוויר', 'מחיר למשתכן', " +
        "'budget', 'transportation'",
    ),
  sort: z
    .enum(["newest", "relevance", "popular", "updated"])
    .optional()
    .describe(
      "Sort results by: 'newest' (creation date), 'relevance' (best match), " +
        "'popular' (most viewed), 'updated' (recently modified)",
    ),
  tags: z
    .string()
    .optional()
    .describe(
      "Filter by exact tag name (case-sensitive). Get valid tag names from " +
        "list_available_tags() or search_tags(). Example: 'תחבורה', 'סביבה', 'GIS'",
    ),
});

export const findDatasetsInteractiveInput = findDatasetsBaseInput.extend({
  interactive: z
    .boolean()
    .optional()
    .describe(
      "Opt-in only. Set to true when the user would benefit from a clarification step " +
        "before receiving a broad result set. If the MCP client supports elicitation and " +
        "the catalog search finds many plausible datasets, the server may ask the user to " +
        "choose a narrowing option such as publisher organization. If unsupported or " +
        "declined, the tool falls back to normal non-interactive results.",
    ),
});

export const findDatasetsInput = findDatasetsInteractiveInput;

export const findDatasetsOutput = z.object({
  count: z.number().describe("Total number of matching datasets in the catalog"),
  results: z
    .array(
      z.object({
        name: z.string(),
        title: z.string(),
        notes: z.string().nullish(),
        organization: z.string().nullish(),
        metadata_modified: z.string().nullish(),
        num_resources: z.number().nullish(),
      }),
    )
    .describe("Matching datasets"),
  query: z.string(),
  sort: z.string().nullish(),
  interactive: z
    .object({
      requested: z.boolean(),
      available: z.boolean(),
      applied: z.boolean(),
      reason: z.string().optional(),
      selected_organization: z.string().optional(),
    })
    .optional()
    .describe("Elicitation status when interactive=true was requested."),
});

export type FindDatasetsInput = z.infer<typeof findDatasetsInput>;
export type FindDatasetsBaseInput = z.infer<typeof findDatasetsBaseInput>;
export type FindDatasetsOutput = z.infer<typeof findDatasetsOutput>;
