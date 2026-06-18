import { z } from "zod";

export const listOrganizationsInput = z.object({});

export const listOrganizationsOutput = z.object({
  total: z.number(),
  organizations: z
    .array(
      z.object({
        name: z.string().describe("Organization slug (use with get_organization_info)"),
        title: z.string(),
        dataset_count: z.number(),
      }),
    )
    .describe("Organizations from the local catalog index, sorted by dataset count"),
  catalog_generated_at: z.string(),
});

export const getOrganizationInfoInput = z.object({
  organization: z
    .string()
    .describe(
      "Organization name (lowercase, hyphenated). " +
        "Get valid names from list_organizations(). " +
        "Examples: 'ministry-of-health', 'tel-aviv-yafo', 'cbs'",
    ),
});

export const getOrganizationInfoOutput = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  image_url: z.string().nullish(),
  state: z.string().nullish(),
  created: z.string().nullish(),
});

export type ListOrganizationsInput = z.infer<typeof listOrganizationsInput>;
export type ListOrganizationsOutput = z.infer<typeof listOrganizationsOutput>;
export type ListOrganizationsOrgItem = ListOrganizationsOutput["organizations"][number];
export type GetOrganizationInfoInput = z.infer<typeof getOrganizationInfoInput>;
export type GetOrganizationInfoOutput = z.infer<typeof getOrganizationInfoOutput>;
