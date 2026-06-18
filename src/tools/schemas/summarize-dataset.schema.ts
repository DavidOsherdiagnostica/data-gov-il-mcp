import { z } from "zod";

export const summarizeDatasetInput = z.object({
  dataset: z
    .string()
    .describe(
      "Dataset name or ID to summarize. Get valid names from find_datasets(), " +
        "list_all_datasets(), or get_dataset_info().",
    ),
  language: z
    .enum(["he", "en"])
    .optional()
    .describe("Preferred summary language. Defaults to Hebrew ('he')."),
  max_tokens: z
    .number()
    .int()
    .min(100)
    .max(1500)
    .optional()
    .describe("Maximum tokens for the client-side model summary. Defaults to 700."),
});

export const summarizeDatasetOutput = z.object({
  dataset: z.object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    notes: z.string().nullish(),
    organization: z.string().nullish(),
    tags: z.array(z.string()),
    metadata_modified: z.string(),
    num_resources: z.number(),
    resources: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        format: z.string(),
        datastore_active: z.boolean(),
        description: z.string().nullish(),
      }),
    ),
  }),
  summary: z.string().nullish().describe("Client-model summary when sampling was available."),
  sampling: z.object({
    requested: z.boolean(),
    available: z.boolean(),
    used: z.boolean(),
    fallback_reason: z.string().optional(),
    model: z.string().optional(),
    stop_reason: z.string().optional(),
  }),
});

export type SummarizeDatasetInput = z.infer<typeof summarizeDatasetInput>;
export type SummarizeDatasetOutput = z.infer<typeof summarizeDatasetOutput>;
