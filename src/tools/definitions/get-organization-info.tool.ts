import { structured, errorResponse } from "../../formatting/response.js";
import type { OrganizationsService } from "../../services/organizations.service.js";
import type { ToolDefinition } from "../tool.interface.js";
import {
  getOrganizationInfoInput,
  getOrganizationInfoOutput,
  type GetOrganizationInfoInput,
  type GetOrganizationInfoOutput,
} from "../schemas/organizations.schema.js";

export function createGetOrganizationInfoTool(
  orgsService: OrganizationsService,
): ToolDefinition<typeof getOrganizationInfoInput, typeof getOrganizationInfoOutput> {
  return {
    name: "get_organization_info",
    title: "Get Organization Info",
    description:
      "Get detailed information about a specific government organization: title, description, " +
      "image URL, state, and creation date. " +
      "Use list_organizations() first to get valid organization names.",
    inputSchema: getOrganizationInfoInput,
    outputSchema: getOrganizationInfoOutput,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "Get Organization Info",
    },
    async handler(input: GetOrganizationInfoInput) {
      try {
        const org = await orgsService.getInfo(input.organization);

        const data: GetOrganizationInfoOutput = {
          id: org.id,
          name: org.name,
          title: org.title,
          description: org.description ?? undefined,
          image_url: org.image_url ?? undefined,
          state: org.state ?? undefined,
          created: org.created ?? undefined,
        };

        return structured(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(
          `Failed to get info for organization '${input.organization}': ${msg}`,
        );
      }
    },
  };
}
