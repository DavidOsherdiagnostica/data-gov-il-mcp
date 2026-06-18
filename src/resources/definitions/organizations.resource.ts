import type { ResourceDefinition, ResourceContent } from "../resource.interface.js";
import type { OrganizationsService } from "../../services/organizations.service.js";

export function createOrganizationsResource(
  orgsService: OrganizationsService,
): ResourceDefinition {
  return {
    uri: "datagov://organizations",
    name: "Government Organizations",
    description:
      "Complete catalog of all government ministries, municipalities, and agencies " +
      "that publish open data on data.gov.il. Updated and cached every 15 minutes.",
    mimeType: "application/json",
    async handler(): Promise<ResourceContent> {
      const organizations = await orgsService.list();
      return {
        uri: "datagov://organizations",
        mimeType: "application/json",
        text: JSON.stringify({ total: organizations.length, organizations }, null, 2),
      };
    },
  };
}
