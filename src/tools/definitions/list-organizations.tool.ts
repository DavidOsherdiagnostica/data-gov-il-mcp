import { structured, errorResponse } from "../../formatting/response.js";
import type { CatalogService } from "../../catalog/index.js";
import type { ToolDefinition } from "../tool.interface.js";
import {
  listOrganizationsInput,
  listOrganizationsOutput,
  type ListOrganizationsOutput,
} from "../schemas/organizations.schema.js";

export function createListOrganizationsTool(
  catalogService: CatalogService,
): ToolDefinition<typeof listOrganizationsInput, typeof listOrganizationsOutput> {
  return {
    name: "list_organizations",
    title: "List Organizations",
    description:
      "List all government ministries, municipalities, and agencies that publish datasets " +
      "on data.gov.il, with their Hebrew titles and dataset counts. " +
      "Results come from the local catalog index (instant, no network call), " +
      "sorted by dataset count. " +
      "Use the organization name with get_organization_info() for full details, " +
      "or as a filter in find_datasets() / list_all_datasets().",
    inputSchema: listOrganizationsInput,
    outputSchema: listOrganizationsOutput,
    annotations: { readOnlyHint: true, idempotentHint: true, title: "List Organizations" },
    handler(_input) {
      try {
        const orgs = catalogService.organizations(200);
        const stats = catalogService.stats();

        const data: ListOrganizationsOutput = {
          total: orgs.length,
          organizations: orgs.map((o) => ({
            name: o.name,
            title: o.title,
            dataset_count: o.count,
          })),
          catalog_generated_at: stats.generatedAt,
        };

        return Promise.resolve(structured(data));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return Promise.resolve(errorResponse(`Failed to list organizations: ${msg}`));
      }
    },
  };
}
