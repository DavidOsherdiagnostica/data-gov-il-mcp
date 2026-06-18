/**
 * Non-env constants — values that don't change per deployment.
 * All numbers, strings, and tuples are typed via `as const`.
 */

export const DEFAULT_LIMITS = {
  list: 10,
  search: 100,
  max: 1000,
} as const;

export const POPULAR_DATASETS = [
  "branches",
  "beer-sheva-municipality-budget-7",
  "mechir-lamishtaken",
  "traffic-counts",
  "population-and-recipients-of-benefits-under-settlement-2012",
] as const;

export const POPULAR_ORGANIZATIONS = [
  "ministry-health",
  "haifa",
  "beer-sheva",
  "lamas",
  "mof",
] as const;

/** Known-good resource IDs used in documentation and tests. */
export const EXAMPLE_RESOURCE_IDS = {
  bankBranches: "2202bada-4baf-45f5-aa61-8c5bad9646d3",
  airStations: "782cfb94-ebbd-4f41-aba2-80c298457a58",
  contaminatedLand: "54aa9ff1-2d89-4899-bb57-bf2a749ff4b3",
} as const;

/** The MCP resource URI scheme used by this server. */
export const RESOURCE_URI_SCHEME = "datagov" as const;

/** User-Agent header sent to the CKAN API. */
export const USER_AGENT = "data-gov-il-mcp/3.0 (+https://github.com/DavidOsherdiagnostica/data-gov-il-mcp)" as const;

export const SORT_OPTIONS = {
  newest: "metadata_created desc",
  relevance: "score desc,metadata_modified desc",
  popular: "views_recent desc",
  updated: "metadata_modified desc",
} as const;


export type SortOption = keyof typeof SORT_OPTIONS;
