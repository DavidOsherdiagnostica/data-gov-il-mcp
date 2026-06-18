/**
 * LLM guidance text — migrated and improved from src/lib/guidance.js.
 * These strings are embedded in tool responses to help LLMs understand
 * how to use the data they receive and what to do next.
 */
import { CkanError } from "../ckan/errors.js";

export const TROUBLESHOOTING = {
  datasets: [
    "Check if dataset name is correct (use find_datasets to search, or list_all_datasets if you need everything)",
    "Some datasets use Hebrew names",
    "Popular working datasets: branches, mechir-lamishtaken",
    "Use list_available_tags to discover topic keywords for searching",
  ],

  organizations: [
    "Check if organization name is correct (use list_organizations to see all)",
    "Organization names are usually in English and lowercase",
    'Try variations like "ministry-of-health" or "health"',
  ],

  search: [
    "Verify resource_id is correct (get from list_resources)",
    "Check if resource has datastore_active=true",
    "Try simpler query first (no filters/fields)",
    "Some resources may be temporarily unavailable",
  ],

  api: [
    "Try again in a moment - the government API might be temporarily unavailable",
    "Check internet connection",
    "Verify CKAN endpoint is accessible",
  ],

  tags: [
    "Use list_available_tags() to see all available topic keywords",
    "Use search_tags('keyword') to find relevant topic names",
    "Topic names are case-sensitive — use exact spelling",
    "Try both Hebrew and English versions if available",
  ],
} as const;

export const PERFORMANCE_TIPS = [
  "Use 'fields' parameter to get only needed columns",
  "Use 'limit' 5-20 for quick exploration",
  "Use 'filters' for exact matches (faster than 'q')",
  "Include 'include_total' for pagination planning",
  "Use topic keywords for more precise searches",
] as const;

export const ANALYSIS_SUGGESTIONS = [
  "For statistics: use 'distinct' to count unique values",
  "For large datasets: start with small limit, then increase",
  "For geographic data: filter by City/Region first",
  "For financial data: sort by Amount/Date fields",
  "Start with list_available_tags to discover relevant data themes",
] as const;

export const RECOMMENDED_WORKFLOW = [
  "RECOMMENDED WORKFLOW:",
  "1. START with list_available_tags to discover relevant topics",
  "2. Use find_datasets('topic-name') with discovered topic names",
  "3. OPTIONAL: Use list_organizations to explore by government body",
  "4. Use get_dataset_info for detailed dataset analysis",
  "5. Use list_resources on interesting datasets",
  "6. Use search_records to get actual data",
  "7. Only use list_all_datasets if you need the complete list (expensive API call!)",
] as const;

/** Shared hint for sort/filters/fields/distinct — embedded in Zod param descriptions. */
export const EXACT_FIELD_IDS_HINT =
  "Field IDs must match exactly (case-sensitive). Get them from fields[] in a prior " +
  "search_records probe (limit=1, no sort/filters/fields/distinct). Do not guess generic " +
  "names like Date or City — invalid IDs cause CKAN HTTP 409.";

/** Format search_records errors with actionable hints for common CKAN failures. */
export function formatSearchRecordsError(err: unknown, resourceId: string): string {
  const base = err instanceof Error ? err.message : String(err);
  const prefix = `Failed to search records in resource '${resourceId}': ${base}`;

  if (err instanceof CkanError && err.statusCode === 409) {
    return (
      `${prefix} CKAN 409 usually means an invalid field in sort, filters, fields, or distinct. ` +
      "Probe first (limit=1, no sort/filters/fields/distinct), then retry with exact IDs from " +
      "response.fields[].id."
    );
  }

  return prefix;
}

/** Guidance for search_records tool. */
export const SEARCH_RECORDS_GUIDANCE = [
  "FIELD NAMES (CRITICAL):",
  "• Never guess field IDs — probe with limit=1 first, read fields[].id from the response",
  "• Invalid sort/filters/fields/distinct names return CKAN HTTP 409",
  "",
  "QUERY PATTERNS THAT WORK WELL:",
  '• Cities: "תל אביב", "ירושלים", "חיפה"',
  '• Banks: "בנק לאומי", "בנק הפועלים", "דיסקונט"',
  "• General: Use Hebrew for Israeli data, English for international",
  "",
  "PERFORMANCE TIPS:",
  "• Use 'fields' parameter to get only needed columns",
  "• Use 'limit' 5-20 for quick exploration",
  "• Use 'filters' for exact matches (faster than 'q')",
  "• Include 'include_total' for pagination planning",
  "",
  "ANALYSIS SUGGESTIONS:",
  "• For statistics: use 'distinct' to count unique values",
  "• For large datasets: start with small limit, then increase",
  "• For geographic data: filter by City/Region first",
  "• For demand/ranking: sort=['Subscribers desc'] (mechir-lamishtaken)",
  "• For dates: use exact ids like LotteryExecutionDate, not LotteryDate",
].join("\n");

/** Guidance text for dataset list responses. */
export const DATASET_LIST_GUIDANCE = [
  "PERFORMANCE WARNING:",
  "• This operation fetches ALL datasets from the government API (expensive!)",
  "• For searching specific topics, use find_datasets instead",
  "• Only use list_all_datasets when you need the complete list",
  "",
  "RECOMMENDED WORKFLOW:",
  "• Start with find_datasets to search by keywords",
  "• Use list_resources on interesting datasets",
  "• Use search_records to get actual data",
].join("\n");

/** Guidance text for resources list responses. */
export const RESOURCES_GUIDANCE = [
  "NEXT STEPS:",
  "• Copy a resource_id from datastore_active=true resources",
  "• Use search_records with that resource_id",
  "• Look for CSV/XLSX formats — they're usually most complete",
  "• Hebrew resources often have English equivalents",
  "",
  "SEARCH TIPS:",
  "• Fields vary by dataset — probe search_records (limit=1) to read exact field IDs",
  "• Do not guess field names; use ids from fields[] before sort/filters/fields/distinct",
  "• Use include_tracking=true to see update frequency",
].join("\n");

/** Tag discovery guidance. */
export const TAGS_GUIDANCE = [
  "TOPIC DISCOVERY GUIDE:",
  "• list_available_tags() → see all categories and popular topics",
  "• list_available_tags(category='transportation') → specific domain topics",
  "• search_tags('keyword') → find topics by Hebrew/English keyword",
  "",
  "TOPIC CATEGORIES AVAILABLE:",
  "• government (ממשל): תקציב, אוצר וכלכלה, משפט",
  "• transportation (תחבורה): תחבורה ציבורית, רכבת, אוטובוסים",
  "• environment (סביבה): מים, זיהום אוויר, פסולת",
  "• health (בריאות): בריאות ורווחה, משרד הבריאות",
  "• organizations (ארגונים): משרדי ממשלה ורשויות",
].join("\n");

/** Formatting helper for troubleshooting suggestions. */
export function formatSuggestions(suggestions: readonly string[]): string {
  return suggestions.map((s) => `  • ${s}`).join("\n");
}
