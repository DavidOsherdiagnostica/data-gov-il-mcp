/** CKAN API endpoint names. */
export const CKAN_ENDPOINTS = {
  PACKAGE_LIST: "package_list",
  PACKAGE_SEARCH: "package_search",
  PACKAGE_SHOW: "package_show",
  DATASTORE_SEARCH: "datastore_search",
  ORGANIZATION_LIST: "organization_list",
  ORGANIZATION_SHOW: "organization_show",
  TAG_LIST: "tag_list",
} as const;

export type CkanEndpoint = (typeof CKAN_ENDPOINTS)[keyof typeof CKAN_ENDPOINTS];
