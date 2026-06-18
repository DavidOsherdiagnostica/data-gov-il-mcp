import { z } from "zod";

export const listAvailableTagsInput = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .describe("Maximum number of tags to return (default: 50, max: 500)."),
  relatedTo: z
    .string()
    .optional()
    .describe(
      "Return only tags that frequently co-occur with this tag. " +
        "Useful for drilling into a topic area. Example: 'תחבורה'",
    ),
});

export const listAvailableTagsOutput = z.object({
  tags: z.array(
    z.object({
      tag: z.string(),
      count: z.number(),
    }),
  ),
  popular: z.array(z.object({ tag: z.string(), count: z.number() })),
  total_tags: z.number(),
  catalog_generated_at: z.string(),
});

export const searchTagsInput = z.object({
  keyword: z
    .string()
    .min(1)
    .describe(
      "Search keyword (Hebrew or English). " +
        "Performs case-insensitive substring matching with fuzzy fallback for typos. " +
        "Examples: 'בנק', 'transport', 'מים', 'GIS'",
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Maximum results to return (default: 30)."),
});

export const searchTagsOutput = z.object({
  keyword: z.string(),
  results: z.array(
    z.object({
      tag: z.string(),
      count: z.number(),
      related: z.array(z.object({ tag: z.string(), count: z.number() })),
    }),
  ),
  total: z.number(),
});

export type ListAvailableTagsInput = z.infer<typeof listAvailableTagsInput>;
export type ListAvailableTagsOutput = z.infer<typeof listAvailableTagsOutput>;
export type SearchTagsInput = z.infer<typeof searchTagsInput>;
export type SearchTagsOutput = z.infer<typeof searchTagsOutput>;
