import { z } from "zod";

export const listResourcesInput = z.object({
  dataset: z
    .string()
    .describe(
      "Dataset name or ID. Get valid names from find_datasets() or list_all_datasets(). " +
        "Example: 'branches' for bank branches dataset.",
    ),
  include_tracking: z
    .boolean()
    .optional()
    .describe("Include view tracking statistics per resource"),
});

export const listResourcesOutput = z.object({
  dataset: z.string(),
  total_resources: z.number(),
  datastore_active_count: z.number().describe("Number of resources queryable via search_records"),
  resources: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      format: z.string(),
      datastore_active: z.boolean(),
      description: z.string().nullish(),
      url: z.string().nullish(),
      size: z.number().nullish(),
      last_modified: z.string().nullish(),
    }),
  ),
});

export type ListResourcesInput = z.infer<typeof listResourcesInput>;
export type ListResourcesOutput = z.infer<typeof listResourcesOutput>;
