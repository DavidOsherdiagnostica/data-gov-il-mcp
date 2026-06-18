import type { ResourceDefinition, ResourceContent } from "../resource.interface.js";
import {
  RECOMMENDED_WORKFLOW,
  TAGS_GUIDANCE,
  SEARCH_RECORDS_GUIDANCE,
} from "../../formatting/guidance.js";

const GUIDE_TEXT = `# data-gov-il-mcp Usage Guide

This MCP server provides access to the Israeli Government Open Data portal (data.gov.il).
It exposes ~1,170 datasets from government ministries, municipalities, and agencies.

## Quick Start

${RECOMMENDED_WORKFLOW.join("\n")}

## Tools Reference

### Discovery Tools
- **list_available_tags()** — Browse topic taxonomy. Use this first for topic-based discovery.
- **search_tags(keyword)** — Find tag names by keyword (Hebrew/English).
- **find_datasets(query, sort?, tags?)** — Search datasets by keywords or tags.
- **list_all_datasets()** — ⚠️ EXPENSIVE — lists all ~1,170 dataset names.
- **list_organizations()** — List all government bodies (cached).

### Dataset Exploration
- **get_dataset_info(dataset)** — Full metadata, tags, resource IDs.
- **list_resources(dataset)** — Resources (files/datastores) within a dataset.
- **get_organization_info(organization)** — Detailed organization info.

### Data Extraction
- **search_records(resource_id, ...)** — Search tabular data in a datastore resource.
  - Supports: free-text search, exact filters, field selection, sorting, pagination, distinct values.

## Resources Reference

- **datagov://organizations** — All organization names (JSON).
- **datagov://tags** — Complete tags taxonomy (JSON).
- **datagov://dataset/{id}** — Dataset metadata by name or ID.
- **datagov://guide** — This guide.

## Topic Discovery

${TAGS_GUIDANCE}

## Advanced Record Search

${SEARCH_RECORDS_GUIDANCE}

## Tips

- Use Hebrew for Israeli-specific data, English for internationally named fields.
- Most records use Hebrew field names — check fields[] in the response first.
- Resources with datastore_active=true can be searched; others are downloadable files only.
- The API is owned by the Israeli government — occasional slowness is expected.
`;

export function createUsageGuideResource(): ResourceDefinition {
  return {
    uri: "datagov://guide",
    name: "Usage Guide",
    description:
      "Complete guide for using the data-gov-il-mcp server: tools, workflows, tips, " +
      "and examples. Read this as context at the start of a session.",
    mimeType: "text/plain",
    handler(): Promise<ResourceContent> {
      return Promise.resolve({
        uri: "datagov://guide",
        mimeType: "text/plain",
        text: GUIDE_TEXT,
      });
    },
  };
}
