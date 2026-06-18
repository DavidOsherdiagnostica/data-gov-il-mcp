import { z } from "zod";

export const getDatasetInfoInput = z.object({
  dataset: z
    .string()
    .describe(
      "Dataset name or ID (e.g. 'branches', 'mechir-lamishtaken'). " +
        "Get valid names from find_datasets() or list_all_datasets().",
    ),
  include_tracking: z
    .boolean()
    .optional()
    .describe("Include view tracking statistics (total views, recent views)"),
});

export const getDatasetInfoOutput = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  notes: z.string().nullish(),
  organization: z.string().nullish(),
  num_resources: z.number(),
  num_tags: z.number(),
  tags: z.array(z.string()),
  metadata_created: z.string(),
  metadata_modified: z.string(),
  license: z.string().nullish(),
  resources: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      format: z.string(),
      datastore_active: z.boolean(),
      description: z.string().nullish(),
    }),
  ),
});

export type GetDatasetInfoInput = z.infer<typeof getDatasetInfoInput>;
export type GetDatasetInfoOutput = z.infer<typeof getDatasetInfoOutput>;
