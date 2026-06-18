import { z } from "zod";
import { DEFAULT_LIMITS } from "../../config/constants.js";
import { EXACT_FIELD_IDS_HINT } from "../../formatting/guidance.js";

export const searchRecordsInput = z.object({
  resource_id: z
    .string()
    .uuid("resource_id must be a valid UUID")
    .describe(
      "Resource UUID from list_resources. Get this ID from datastore_active=true resources. " +
        "Example: '2202bada-4baf-45f5-aa61-8c5bad9646d3' for bank branches",
    ),
  q: z
    .string()
    .optional()
    .describe(
      "Free-text search across all fields. Supports Hebrew/English, partial matches, and " +
        "multiple words. Examples: 'תל אביב', 'בנק לאומי', 'emergency'",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(DEFAULT_LIMITS.max)
    .default(DEFAULT_LIMITS.list)
    .describe(
      `Number of results to return (1-${DEFAULT_LIMITS.max}). ` +
        "Use 5-10 for quick exploration, 20-50 for analysis, 100-1000 for data extraction",
    ),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      "Skip first N results for pagination. page 1: offset=0, page 2: offset=limit, etc.",
    ),
  filters: z
    .record(z.unknown())
    .optional()
    .describe(
      "Exact field matches as JSON object. " +
        EXACT_FIELD_IDS_HINT +
        ' Examples: {"LamasName": "מגדל העמק"}, {"CityName": ["תל אביב", "חיפה"]}.',
    ),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      "Return only specific columns. " +
        EXACT_FIELD_IDS_HINT +
        ' Examples: ["LamasName", "Subscribers"], ["LotteryExecutionDate", "Winners"].',
    ),
  sort: z
    .array(z.string())
    .optional()
    .describe(
      'Sort by field ID. Format: ["field asc"] or ["field desc"]. ' +
        EXACT_FIELD_IDS_HINT +
        ' Examples: ["LotteryExecutionDate desc"], ["Subscribers desc"].',
    ),
  include_total: z
    .boolean()
    .optional()
    .describe("Include total count of matching records — essential for pagination"),
  distinct: z
    .string()
    .optional()
    .describe(
      "Return unique values for one field only (no full records). " +
        EXACT_FIELD_IDS_HINT +
        ' Examples: "LamasName", "CityName".',
    ),
});

export const searchRecordsOutput = z.object({
  resource_id: z.string(),
  records: z.array(z.record(z.unknown())).describe("Matching data records"),
  fields: z
    .array(z.object({ id: z.string(), type: z.string() }))
    .describe("Schema of the resource fields"),
  total: z.number().optional().describe("Total matching records (only when include_total=true)"),
  limit: z.number(),
  offset: z.number(),
});

export type SearchRecordsInput = z.infer<typeof searchRecordsInput>;
export type SearchRecordsOutput = z.infer<typeof searchRecordsOutput>;
