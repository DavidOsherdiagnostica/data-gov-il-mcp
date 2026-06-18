/**
 * CKAN API response fixtures for deterministic tests.
 * Snapshot of real responses from data.gov.il (sanitized).
 */
import type { CkanDataset, CkanOrganization, PackageSearchResult, DatastoreSearchResult } from "../../src/ckan/types.js";

export const FIXTURE_DATASET: CkanDataset = {
  id: "a7296851-9c01-4d89-a90b-db3e03b1f73a",
  name: "branches",
  title: "Bank Branches",
  notes: "Complete list of bank branches in Israel",
  state: "active",
  type: "dataset",
  license_id: "cc-by",
  license_title: "Creative Commons Attribution",
  metadata_created: "2019-01-01T00:00:00",
  metadata_modified: "2024-06-01T00:00:00",
  num_resources: 2,
  num_tags: 3,
  tags: [
    { id: "tag-1", name: "בנקים" },
    { id: "tag-2", name: "פיננסים" },
    { id: "tag-3", name: "סניפים" },
  ],
  resources: [
    {
      id: "2202bada-4baf-45f5-aa61-8c5bad9646d3",
      name: "Bank Branches",
      description: "Bank branches data",
      format: "CSV",
      url: "https://data.gov.il/datastore/dump/2202bada-4baf-45f5-aa61-8c5bad9646d3",
      datastore_active: true,
    },
    {
      id: "abc12345-1234-1234-1234-123456789012",
      name: "Metadata",
      description: "Dataset metadata",
      format: "JSON",
      url: "https://data.gov.il/datastore/dump/abc12345",
      datastore_active: false,
    },
  ],
  organization: {
    id: "org-1",
    name: "bank-of-israel",
    title: "Bank of Israel",
    description: "Central bank",
  },
};

export const FIXTURE_PACKAGE_SEARCH: PackageSearchResult = {
  count: 2,
  results: [FIXTURE_DATASET],
  sort: "score desc",
};

export const FIXTURE_ORGANIZATION: CkanOrganization = {
  id: "org-1",
  name: "bank-of-israel",
  title: "Bank of Israel",
  description: "Central bank of Israel",
  image_url: "https://data.gov.il/logo.png",
  state: "active",
  created: "2015-01-01T00:00:00",
};

export const FIXTURE_DATASTORE_SEARCH: DatastoreSearchResult = {
  resource_id: "2202bada-4baf-45f5-aa61-8c5bad9646d3",
  fields: [
    { id: "_id", type: "int" },
    { id: "Bank_Name", type: "text" },
    { id: "Branch_Name", type: "text" },
    { id: "City", type: "text" },
    { id: "Address", type: "text" },
  ],
  records: [
    {
      _id: 1,
      Bank_Name: "Bank Leumi",
      Branch_Name: "Tel Aviv Main",
      City: "תל אביב",
      Address: "123 Dizengoff St",
    },
    {
      _id: 2,
      Bank_Name: "Bank Hapoalim",
      Branch_Name: "Jerusalem Center",
      City: "ירושלים",
      Address: "45 Jaffa Road",
    },
  ],
  total: 1501,
  limit: 10,
  offset: 0,
};
