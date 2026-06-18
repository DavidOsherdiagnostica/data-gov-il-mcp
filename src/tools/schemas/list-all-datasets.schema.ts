import { z } from "zod";

export const listAllDatasetsInput = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Maximum number of datasets to return (default: all)."),
  org: z
    .string()
    .optional()
    .describe(
      "Filter by organization slug, e.g. 'cbs', 'ministry-of-health'. " +
        "Get valid slugs from list_organizations().",
    ),
});

export const listAllDatasetsOutput = z.object({
  total: z.number().describe("Total number of datasets in the catalog"),
  datasets: z
    .array(
      z.object({
        name: z.string().describe("Dataset slug (use with get_dataset_info / list_resources)"),
        title: z.string(),
        org: z.string(),
        num_resources: z.number(),
      }),
    )
    .describe("Dataset summaries from the local catalog index"),
  truncated: z.boolean(),
  catalog_generated_at: z.string(),
});

export type ListAllDatasetsInput = z.infer<typeof listAllDatasetsInput>;
export type ListAllDatasetsOutput = z.infer<typeof listAllDatasetsOutput>;
