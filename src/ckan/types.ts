/**
 * TypeScript types for the CKAN API responses from data.gov.il.
 * All types are derived from the actual API responses.
 */

/** Generic CKAN API envelope — every endpoint wraps its result in this. */
export interface CkanEnvelope<T> {
  success: boolean;
  result: T;
  help: string;
  error?: {
    message?: string;
    [key: string]: unknown;
  };
}

/** A single resource (file/datastore) attached to a dataset. */
export interface CkanResource {
  id: string;
  name: string;
  description?: string;
  format: string;
  url: string;
  /** true = accessible via datastore_search */
  datastore_active: boolean;
  mimetype?: string;
  size?: number;
  created?: string;
  last_modified?: string;
  /** Number of recent views (returned when include_tracking=true) */
  tracking_summary?: {
    total: number;
    recent: number;
  };
}

/** A tag attached to a dataset. */
export interface CkanTag {
  id: string;
  name: string;
  vocabulary_id?: string;
}

/** A dataset (package) from the CKAN API. */
export interface CkanDataset {
  id: string;
  name: string;
  title: string;
  notes?: string;
  url?: string;
  state: string;
  type: string;
  license_id?: string;
  license_title?: string;
  author?: string;
  author_email?: string;
  maintainer?: string;
  maintainer_email?: string;
  metadata_created: string;
  metadata_modified: string;
  num_resources: number;
  num_tags: number;
  tags: CkanTag[];
  resources: CkanResource[];
  organization?: CkanOrganizationRef;
  extras?: Array<{ key: string; value: string }>;
  tracking_summary?: {
    total: number;
    recent: number;
  };
}

/** Slim org reference embedded in dataset responses. */
export interface CkanOrganizationRef {
  id: string;
  name: string;
  title: string;
  description?: string;
  image_url?: string;
  state?: string;
}

/** Full organization detail from organization_show. */
export interface CkanOrganization extends CkanOrganizationRef {
  packages?: CkanDataset[];
  users?: Array<{
    id: string;
    name: string;
    capacity: string;
  }>;
  created?: string;
}

/** Result of package_search. */
export interface PackageSearchResult {
  count: number;
  results: CkanDataset[];
  sort: string;
  facets?: Record<string, unknown>;
}

/** A single field descriptor in a datastore resource. */
export interface DatastoreField {
  id: string;
  type: string;
  info?: {
    label?: string;
    notes?: string;
  };
}

/** Result of datastore_search. */
export interface DatastoreSearchResult {
  resource_id: string;
  fields: DatastoreField[];
  records: Array<Record<string, unknown>>;
  total?: number;
  _links?: {
    start?: string;
    next?: string;
  };
  limit?: number;
  offset?: number;
}

/** Parameters accepted by datastore_search. */
export interface DatastoreSearchParams {
  resource_id: string;
  q?: string;
  filters?: string; // JSON-serialized object
  fields?: string; // comma-separated field names
  sort?: string; // comma-separated "field asc/desc"
  limit?: number;
  offset?: number;
  include_total?: string; // "true" | "false"
  distinct?: string; // field name
}
