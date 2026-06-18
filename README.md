<img width="1024" height="290" alt="gov-mcp" src="https://github.com/user-attachments/assets/e86fed13-3756-43b3-aba8-85778099e9a6" />



# data-gov-il-mcp

Production-grade [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for Israeli Government Open Data from [data.gov.il](https://data.gov.il).

This server gives MCP-compatible clients structured access to Israeli government datasets, resources, tags, organizations, and tabular records through the official CKAN API. It is written in TypeScript, validates inputs and outputs with Zod, returns JSON-first tool responses, and supports both local `stdio` and remote Streamable HTTP transports.

## Highlights

| Area | Status |
|---|---|
| MCP tools | 9 tools by default, 10 with optional Sampling enabled |
| MCP resources | 5 static resources + 1 dataset resource template |
| MCP prompts | 3 domain prompts with argument completions |
| Discovery | In-memory catalog snapshot with Hebrew normalization, fuzzy matching, tag ranking, and co-occurrence |
| Transports | `stdio` and Streamable HTTP |
| Auth | `none`, API key bearer auth, OAuth 2.1 JWT/JWKS |
| HTTP hardening | Helmet, CORS, rate limiting, request IDs, Host/Origin validation |
| Responses | `structuredContent` plus identical JSON in `content[0].text` |
| Runtime config | Environment-driven, validated at startup with Zod |

## Quick Start

### Claude Desktop / Local Stdio

Use the published package directly:

```json
{
  "mcpServers": {
    "data-gov-il": {
      "command": "npx",
      "args": ["-y", "data-gov-il-mcp"]
    }
  }
}
```

### Streamable HTTP

```bash
npm install -g data-gov-il-mcp
data-gov-il-mcp-http
```

Then configure your MCP client:

```json
{
  "mcpServers": {
    "data-gov-il": {
      "url": "http://localhost:3664/mcp"
    }
  }
}
```

### Docker

```bash
docker run -p 3664:3664 ghcr.io/davidosherproceed/data-gov-il-mcp:latest
```

For local development:

```bash
npm install
npm run build
npm run start:stdio
# or
npm run start:http
```

## Catalog Discovery Layer

The server ships with a committed catalog snapshot at `src/data/catalog/catalog.snapshot.json`. The snapshot is generated from data.gov.il and bundled into the build. At startup, it is validated and indexed in memory.

The discovery layer powers:

- `find_datasets` catalog-first search with live CKAN fallback.
- `list_all_datasets` instant local enumeration with optional organization filter.
- `list_organizations` instant local organization list with dataset counts.
- `list_available_tags` and `search_tags` from real CKAN tag/facet data.
- Dynamic completions for `datagov://dataset/{id}`.
- `datagov://tags` and `datagov://catalog/stats` resources.

It includes:

- Hebrew normalization, including nikud removal and final-letter normalization.
- Tokenization and trigram indexes for fuzzy matches and typo tolerance.
- Dataset, tag, and organization maps.
- Tag-to-dataset and organization-to-dataset indexes.
- Tag co-occurrence for related tag suggestions.
- Weighted ranking across exact, token, tag, organization, and fuzzy signals.

Refresh the snapshot:

```bash
npm run catalog:refresh
npm run build
```

A scheduled GitHub Actions workflow (`.github/workflows/catalog-refresh.yml`) refreshes the snapshot and opens a PR when catalog data changes.

More detail: [`docs/catalog-discovery-layer.md`](docs/catalog-discovery-layer.md).

## Tools

All successful tool responses return:

- `structuredContent`: the typed JSON object.
- `content[0].text`: the same object serialized as JSON for text-only clients.

### Default Tools

| Tool | Purpose |
|---|---|
| `find_datasets` | Primary dataset discovery tool. Uses the local catalog first, then live CKAN fallback when needed. |
| `get_dataset_info` | Full CKAN metadata for a dataset, including tags and resources. |
| `list_all_datasets` | Instant catalog-backed dataset summaries, optionally filtered by organization. |
| `list_resources` | Lists files/datastores inside a dataset and identifies `datastore_active` resources. |
| `search_records` | Queries CKAN datastore records with full-text search, filters, fields, sorting, pagination, and distinct values. |
| `list_organizations` | Catalog-backed organizations with Hebrew titles and dataset counts. |
| `get_organization_info` | Live CKAN organization metadata. |
| `list_available_tags` | Ranked catalog tags with dataset counts and related tags. |
| `search_tags` | Fuzzy tag search with related tag suggestions. |

### Optional Tools

| Tool | Enabled By | Purpose |
|---|---|---|
| `summarize_dataset` | `MCP_ENABLE_SAMPLING=true` | Requests MCP Sampling from compatible clients to produce a human-readable dataset summary. Falls back to metadata when Sampling is unavailable. |

### Elicitation in `find_datasets`

`find_datasets` can optionally expose an `interactive` parameter:

```json
{
  "query": "תחבורה",
  "interactive": true
}
```

This is only registered when:

```bash
MCP_ENABLE_ELICITATION=true
```

When enabled, compatible clients may show a clarification form for broad searches. For example, the server can ask the user to narrow many matching datasets by publisher organization. If the client does not support Elicitation, the user declines, or the request times out, the tool falls back to normal search results.

This is disabled by default because MCP client support varies.

## Resources

| URI | Type | Description |
|---|---|---|
| `datagov://organizations` | Static JSON | Organization list from CKAN, cached. |
| `datagov://tags` | Static JSON | Ranked tags from the committed catalog snapshot. |
| `datagov://featured` | Static JSON | Curated high-value datasets with ready-to-use `resource_id` values and field schemas. |
| `datagov://guide` | Static text | Usage guide for tools, resources, and recommended workflows. |
| `datagov://catalog/stats` | Static JSON | Snapshot metadata: generated time, dataset count, tag count, organization count, top organizations. |
| `datagov://dataset/{id}` | Template JSON | Full dataset metadata by dataset slug or ID. Includes dynamic completions and a catalog-backed resource list. |

The server also implements resource subscriptions in a minimal standards-compliant way:

- Advertises `resources.subscribe`.
- Handles `resources/subscribe` and `resources/unsubscribe`.
- Sends `notifications/resources/updated` only for resources a client subscribed to.
- Does not poll CKAN in real time.

## Prompts

| Prompt | Argument | Purpose |
|---|---|---|
| `food-nutrition-analysis` | `analysis_type` | Food prices, nutrition, kosher, safety, import/export. |
| `environmental-sustainability-analysis` | `analysis_focus` | Air quality, green buildings, waste, water, contaminated sites. |
| `real-estate-market-analysis` | `market_focus` | Housing, urban renewal, subsidized housing, city/property analysis. |

Prompt arguments use MCP completions. Domain focus suggestions are curated, and organization completions are catalog-backed.

## Optional MCP Client Features

These features are off by default. Enable them only when your target MCP client supports them and you want the server to expose them.

| Variable | Default | Effect |
|---|---|---|
| `MCP_ENABLE_ELICITATION` | `false` | Adds `interactive` to `find_datasets` and allows server-initiated clarification forms. Works in clients such as Cursor and Claude Code. |
| `MCP_ENABLE_SAMPLING` | `false` | Registers `summarize_dataset`, which requests client-side model generation through MCP Sampling. |

Client support differs:

- Cursor supports Elicitation, but does not currently expose Sampling.
- Claude Code supports Elicitation in recent versions.
- Claude Desktop supports many MCP features, but Elicitation support is not reliable/available.
- Sampling availability varies; the server always falls back safely.

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Core

| Variable | Default | Description |
|---|---|---|
| `TRANSPORT` | `stdio` | Default transport when using the generic entry point. Dedicated binaries are also available. |
| `PORT` | `3664` | HTTP port. |
| `HOST` | `0.0.0.0` | HTTP bind host. |
| `CORS_ORIGIN` | `*` | Allowed CORS origins. Avoid wildcard in production browser deployments. |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, or `trace`. |
| `NODE_ENV` | `production` | `development`, `production`, or `test`. |

### CKAN

| Variable | Default | Description |
|---|---|---|
| `CKAN_BASE_URL` | `https://data.gov.il/api/3/action` | CKAN action API base URL. |
| `CKAN_TIMEOUT_MS` | `10000` | Default CKAN request timeout. |
| `CKAN_SEARCH_TIMEOUT_MS` | `15000` | Timeout for heavier datastore/search requests. |
| `CACHE_TTL_MS` | `300000` | Default cache TTL. |
| `CACHE_MAX_ITEMS` | `500` | Max entries per in-memory cache. |

### HTTP Hardening

| Variable | Default | Description |
|---|---|---|
| `TRUST_PROXY` | `false` | Trust reverse proxy headers. Set when behind nginx/Caddy/ALB. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window. Set `0` to disable. |
| `RATE_LIMIT_MAX` | `120` | Requests per IP per window. Set `0` to disable. |
| `ALLOWED_HOSTS` | empty | Host allowlist for DNS rebinding protection. Defaults to loopback/local hosts when unset. |
| `ALLOWED_ORIGINS` | empty | Browser Origin allowlist. Falls back to `CORS_ORIGIN` when appropriate. |

### Authentication

| Variable | Default | Description |
|---|---|---|
| `AUTH_MODE` | `none` | `none`, `apikey`, or `oauth`. |
| `API_KEYS` | empty | Comma-separated bearer tokens for `AUTH_MODE=apikey`. |
| `OAUTH_ISSUER` | unset | Expected JWT issuer for `AUTH_MODE=oauth`. |
| `OAUTH_AUDIENCE` | unset | Expected JWT audience for `AUTH_MODE=oauth`. |
| `OAUTH_JWKS_URI` | unset | JWKS URL for JWT verification. |
| `OAUTH_RESOURCE_SERVER` | unset | Canonical MCP resource URL for OAuth protected resource metadata. Usually includes `/mcp`. |

### Service Identity

| Variable | Default | Description |
|---|---|---|
| `SERVICE_NAME` | package/server default | MCP server name override. |
| `SERVICE_VERSION` | package version | MCP server version override. |
| `SERVICE_DESCRIPTION` | built-in description | MCP server semantic description override. |

## Recommended Workflows

### Find and Query a Dataset

1. Use `find_datasets` with natural Hebrew or English terms.
2. Use `get_dataset_info` or `list_resources` for a chosen dataset.
3. Pick a resource with `datastore_active=true`.
4. Use `search_records` with `limit=5` first to inspect fields.
5. Add `filters`, `fields`, `sort`, `distinct`, or pagination as needed.

Example flow:

```text
find_datasets({ "query": "מחיר למשתכן" })
get_dataset_info({ "dataset": "mechir-lamishtaken" })
search_records({
  "resource_id": "7c8255d0-49ef-49db-8904-4cf917586031",
  "limit": 5,
  "include_total": true
})
```

### Discover Tags

```text
search_tags({ "keyword": "דיור", "limit": 5 })
find_datasets({ "query": "תחבורה", "tags": "תחבורה ציבורית" })
```

### Use Interactive Discovery

Requires:

```bash
MCP_ENABLE_ELICITATION=true
```

Then an agent may call:

```text
find_datasets({ "query": "תחבורה", "interactive": true })
```

Compatible clients may show a form asking the user to narrow results.

### Use Client-Side Summaries

Requires:

```bash
MCP_ENABLE_SAMPLING=true
```

Then:

```text
summarize_dataset({ "dataset": "mechir-lamishtaken", "language": "he" })
```

If Sampling is unavailable, the tool returns the dataset metadata and `sampling.used=false`.

## Development

```bash
npm install

# Type-check
npm run typecheck

# Lint
npm run lint

# Test
npm test

# Build
npm run build

# Refresh local catalog snapshot
npm run catalog:refresh
```

Run locally:

```bash
# stdio
npm run build
npm run start:stdio

# HTTP
npm run build
npm run start:http
```

Enable optional features locally:

```bash
MCP_ENABLE_ELICITATION=true MCP_ENABLE_SAMPLING=true npm run start:http
```

On PowerShell:

```powershell
$env:MCP_ENABLE_ELICITATION="true"
$env:MCP_ENABLE_SAMPLING="true"
npm run start:http
```

## Project Structure

```text
src/
  auth/           Authentication providers and Express middleware
  bin/            stdio and HTTP entry points
  cache/          In-memory TTL/LRU cache
  catalog/        Snapshot validation, indexing, fuzzy search, CatalogService
  ckan/           Typed CKAN API client and CKAN response types
  config/         Zod env config, constants, server identity
  core/           Dependency container, MCP server factory, lifecycle
  data/catalog/   Committed catalog snapshot artifact
  formatting/     JSON response builders and guidance text
  observability/  Pino logger
  prompts/        MCP prompt definitions, templates, registration
  resources/      MCP resources, templates, subscriptions
  services/       Domain services for CKAN data access
  tools/          MCP tool definitions and Zod schemas
  transports/     stdio and Streamable HTTP transports
tests/
  fixtures/       Test fixtures
  unit/           Unit tests
scripts/
  refresh-catalog.ts
docs/
  catalog-discovery-layer.md
  MIGRATION.md
```

## Docker

```bash
docker build -t data-gov-il-mcp .
docker run -p 3664:3664 data-gov-il-mcp
```

With optional features:

```bash
docker run -p 3664:3664 \
  -e MCP_ENABLE_ELICITATION=true \
  -e MCP_ENABLE_SAMPLING=true \
  data-gov-il-mcp
```

## Quality

The project is expected to pass:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Current implementation includes unit coverage for environment parsing, auth providers, CKAN errors, cache, formatting, catalog text normalization/fuzzy/index/search logic, snapshot validation, services, resources, subscriptions, and HTTP Host/Origin guard.

## License

[MIT](LICENSE)
