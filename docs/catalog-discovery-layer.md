# Catalog Discovery Layer

## Overview

The Catalog Discovery Layer is an in-memory intelligence layer built on top of the raw CKAN API. Instead of sending every search straight to `package_search`, the server loads a **committed snapshot** of the entire data.gov.il catalog at startup, builds multiple in-memory indexes, and answers most queries locally — with a live CKAN fallback for brand-new datasets.

### What it provides

| Capability | How |
|---|---|
| Fast keyword search | Token matching on title / notes / tags / org |
| Fuzzy / typo tolerance | Trigram inverted index (character-level) |
| Hebrew morphology handling | Final-letter normalization (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ), nikud stripping |
| Tag co-occurrence | Graph built from tag pairs on the same dataset |
| Dynamic completions | `datagov://dataset/{id}` completions via `CatalogService.completeDatasetName()` |
| Real tag counts | Derived from actual CKAN facets, not hand-curated |

---

## Snapshot artifact

**Location:** `src/data/catalog/catalog.snapshot.json`

**This file is committed to the repository.** It is the source of truth for the discovery layer. The server never crawls CKAN at startup — it loads this file (inlined into the bundle by tsup at build time).

### Shape

```json
{
  "meta": {
    "schemaVersion": 1,
    "generatedAt": "2026-06-18T00:00:00.000Z",
    "ckanBaseUrl": "https://data.gov.il/api/3/action",
    "datasetCount": 1193,
    "tagCount": 1000,
    "orgCount": 61
  },
  "datasets": [
    {
      "id": "uuid",
      "name": "dataset-slug",
      "title": "Dataset Title",
      "notes": "Description (truncated to ~300 chars)",
      "org": "org-slug",
      "orgTitle": "Organization Name",
      "tags": ["tag1", "tag2"],
      "formats": ["CSV", "JSON"],
      "numResources": 3,
      "modified": "2026-01-01T00:00:00.000Z"
    }
  ],
  "tags": [{ "name": "אוצר וכלכלה", "count": 92 }],
  "orgs": [{ "name": "bank-of-israel", "title": "בנק ישראל", "count": 12 }]
}
```

Co-occurrence and trigram indexes are **not stored** in the file — they are derived in-memory at startup from the datasets array (~100ms).

---

## Refreshing the snapshot

Run the refresh script whenever the catalog needs to be updated:

```bash
npm run catalog:refresh
```

The script:
1. Fetches all tag names via `tag_list?all_fields=true` (1 call)
2. Fetches real tag counts via `package_search?facet.field=["tags"]&rows=0` (1 call)
3. Paginates `package_search?q=*:*` to collect all ~1 200 datasets (~13 calls with rows=100)
4. Builds and validates the snapshot via zod
5. Writes `src/data/catalog/catalog.snapshot.json`

Total: ~15 API calls, ~7 seconds with a 150ms polite delay.

After refreshing, **commit the updated snapshot and rebuild**:

```bash
git add src/data/catalog/catalog.snapshot.json
git commit -m "chore: refresh catalog snapshot"
npm run build
```

### Environment variable

By default the script targets `https://data.gov.il/api/3/action`. Override via:

```bash
CKAN_BASE_URL=https://data.gov.il/api/3/action npm run catalog:refresh
```

---

## Automated refresh (GitHub Actions)

A scheduled workflow at `.github/workflows/catalog-refresh.yml` runs `catalog:refresh` weekly and opens a pull request when the snapshot changes. This keeps the committed data fresh without manual intervention.

---

## Source layout

```
src/catalog/
├── types.ts              # CatalogSnapshot, DatasetSummary, TagStat, OrgStat, CatalogIndexes
├── snapshot.schema.ts    # Zod schema (validates committed artifact on load)
├── snapshot.ts           # Loads + validates catalog.snapshot.json at module init
├── text.ts               # normalize(), trigrams(), tokenize()
├── fuzzy.ts              # trigramSimilarity(), trigramCandidates()
├── indexes.ts            # buildIndexes() — builds all in-memory maps
├── search.ts             # searchDatasets(), completeDatasetName(), searchTags()
├── catalog.service.ts    # CatalogService — public API for the rest of the app
└── index.ts              # Barrel

src/data/catalog/
└── catalog.snapshot.json # Committed, versioned artifact

scripts/
└── refresh-catalog.ts    # Standalone refresh script (run with tsx)
```

---

## Search scoring

`find_datasets` queries the catalog first (no network I/O) and falls back to live CKAN only when the catalog returns zero results (e.g. brand-new datasets not yet in the snapshot).

Scoring blends three weighted signals:

| Signal | Weight | Notes |
|---|---|---|
| Title exact full match | 20 | Highest priority |
| Title exact partial match | 10 | |
| Title token match | 5 per token | |
| Tag exact full match | 8 | |
| Tag token match | 4 per token | |
| Org name/title match | 2 | |
| Notes token match | 1 per token | |
| Trigram fuzzy (title + name) | up to 3 | Handles typos + morphology |

Weights are tunable in `src/catalog/search.ts` (`const W = { ... }`).

---

## Schema versioning

The `schemaVersion` field in `meta` is validated as `z.literal(1)`. When the snapshot shape changes incompatibly (e.g. a field is renamed or removed), increment `SNAPSHOT_SCHEMA_VERSION` in `src/catalog/snapshot.schema.ts`. Old committed snapshots will fail validation and the server will refuse to start, printing an actionable message to run `npm run catalog:refresh`.
