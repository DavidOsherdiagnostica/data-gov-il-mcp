#!/usr/bin/env tsx
/**
 * Catalog refresh script — regenerates src/data/catalog/catalog.snapshot.json
 * by crawling the live data.gov.il CKAN API.
 *
 * Usage:
 *   npm run catalog:refresh
 *
 * Strategy (minimizes API calls):
 *  1. tag_list?all_fields=true            → all tag names + IDs (1 call)
 *  2. package_search?facet.field=["tags"] → real tag counts (1 call)
 *  3. package_search?q=*:*&rows=100       → paginated, collects every dataset
 *     with full tags[] + org in a single pass (~43 calls for ~4 300 datasets)
 *
 * Total: ~45 API calls, ~10 s with a 150 ms polite delay between pages.
 *
 * The generated snapshot is committed to the repo so the server never needs
 * to crawl CKAN at startup. Re-run this script weekly (or via CI) to keep
 * the catalog fresh.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import axios from "axios";
import { catalogSnapshotSchema, SNAPSHOT_SCHEMA_VERSION } from "../src/catalog/snapshot.schema.js";
import type { DatasetSummary, TagStat, OrgStat, CatalogSnapshot } from "../src/catalog/types.js";

// ── Configuration ────────────────────────────────────────────────────────────

const CKAN_BASE = (process.env["CKAN_BASE_URL"] ?? "https://data.gov.il/api/3/action").replace(
  /\/+$/,
  "",
);
const PAGE_SIZE = 100;
const DELAY_MS = 150;
const NOTES_MAX = 300;
const USER_AGENT =
  "data-gov-il-mcp/catalog-refresh (+https://github.com/DavidOsherdiagnostica/data-gov-il-mcp)";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../src/data/catalog/catalog.snapshot.json");

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface CkanEnvelope<T> {
  success: boolean;
  result: T;
  error?: { message?: string };
}

interface CkanTagFull {
  id: string;
  name: string;
  display_name: string;
  vocabulary_id: string | null;
}

interface CkanDataset {
  id: string;
  name: string;
  title: string;
  notes?: string | null;
  metadata_modified: string;
  num_resources: number;
  tags: Array<{ name: string }>;
  resources: Array<{ format?: string | null }>;
  organization?: { name: string; title: string } | null;
}

interface PackageSearchResult {
  count: number;
  results: CkanDataset[];
  facets?: Record<string, Record<string, number>>;
}

async function ckanGet<T>(endpoint: string, params: Record<string, unknown>): Promise<T> {
  const res = await axios.get<CkanEnvelope<T>>(`${CKAN_BASE}/${endpoint}`, {
    params,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    timeout: 30_000,
  });
  const data = res.data;
  if (!data.success) {
    throw new Error(`CKAN error on ${endpoint}: ${data.error?.message ?? "unknown"}`);
  }
  return data.result;
}

// ── Step 1: Tag list ──────────────────────────────────────────────────────────

async function fetchTagList(): Promise<CkanTagFull[]> {
  process.stdout.write("Fetching tag list...");
  const tags = await ckanGet<CkanTagFull[]>("tag_list", {
    all_fields: true,
    limit: 5000,
  });
  process.stdout.write(` ${tags.length} tags\n`);
  return tags;
}

// ── Step 2: Tag counts via facets ─────────────────────────────────────────────

async function fetchTagCounts(): Promise<Record<string, number>> {
  process.stdout.write("Fetching tag counts via facets...");
  const result = await ckanGet<PackageSearchResult>("package_search", {
    "facet.field": '["tags"]',
    "facet.limit": 1000,
    rows: 0,
  });
  const counts = (result.facets?.["tags"] as Record<string, number> | undefined) ?? {};
  process.stdout.write(` ${Object.keys(counts).length} tags with counts\n`);
  return counts;
}

// ── Step 3: Paginated dataset crawl ──────────────────────────────────────────

async function fetchAllDatasets(): Promise<CkanDataset[]> {
  process.stdout.write("Crawling all datasets...\n");
  const all: CkanDataset[] = [];
  let start = 0;
  let total: number | null = null;

  while (total === null || start < total) {
    if (start > 0) await delay(DELAY_MS);

    const result = await ckanGet<PackageSearchResult>("package_search", {
      q: "*:*",
      rows: PAGE_SIZE,
      start,
      sort: "metadata_modified desc",
    });

    if (total === null) {
      total = result.count;
      process.stdout.write(`  Total datasets: ${total}\n`);
    }

    all.push(...result.results);
    start += PAGE_SIZE;

    const pct = Math.min(100, Math.round((all.length / total) * 100));
    process.stdout.write(`  Fetched ${all.length}/${total} (${pct}%)\r`);
  }

  process.stdout.write(`\n  Done. Collected ${all.length} datasets.\n`);
  return all;
}

// ── Build snapshot ─────────────────────────────────────────────────────────────

function buildSnapshot(
  tagList: CkanTagFull[],
  tagCounts: Record<string, number>,
  datasets: CkanDataset[],
): CatalogSnapshot {
  const startedAt = Date.now();

  // Summarize datasets
  const summaries: DatasetSummary[] = datasets.map((ds) => ({
    id: ds.id,
    name: ds.name,
    title: ds.title ?? ds.name,
    notes: (ds.notes ?? "").trim().slice(0, NOTES_MAX),
    org: ds.organization?.name ?? "",
    orgTitle: ds.organization?.title ?? "",
    tags: [...new Set(ds.tags.map((t) => t.name))],
    formats: [
      ...new Set(
        ds.resources.map((r) => (r.format ?? "").toUpperCase()).filter(Boolean),
      ),
    ],
    numResources: ds.num_resources,
    modified: ds.metadata_modified,
  }));

  // Build tag stats: merge tag_list names with facet counts
  const knownNames = new Set(tagList.map((t) => t.name));
  // Also include tags seen in datasets but not in tag_list (rare edge case)
  for (const ds of summaries) {
    for (const tag of ds.tags) {
      knownNames.add(tag);
    }
  }

  const tags: TagStat[] = [...knownNames]
    .map((name) => ({ name, count: tagCounts[name] ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  // Build org stats
  const orgMap = new Map<string, { title: string; count: number }>();
  for (const ds of summaries) {
    if (!ds.org) continue;
    const entry = orgMap.get(ds.org);
    if (entry) entry.count++;
    else orgMap.set(ds.org, { title: ds.orgTitle, count: 1 });
  }
  const orgs: OrgStat[] = [...orgMap.entries()]
    .map(([name, { title, count }]) => ({ name, title, count }))
    .sort((a, b) => b.count - a.count);

  const snapshot: CatalogSnapshot = {
    meta: {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      ckanBaseUrl: CKAN_BASE,
      datasetCount: summaries.length,
      tagCount: tags.length,
      orgCount: orgs.length,
    },
    datasets: summaries,
    tags,
    orgs,
  };

  process.stdout.write(`  Snapshot built in ${Date.now() - startedAt}ms\n`);
  return snapshot;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startedAt = Date.now();
  process.stdout.write(`\n=== catalog:refresh ===\nTarget: ${CKAN_BASE}\n\n`);

  const [tagList, tagCounts, datasets] = await Promise.all([
    fetchTagList(),
    fetchTagCounts(),
    // Datasets must be sequential (paginated), run after the parallel calls
  ]).then(async ([tl, tc]) => [tl, tc, await fetchAllDatasets()] as const);

  process.stdout.write("\nBuilding snapshot...\n");
  const snapshot = buildSnapshot(tagList, tagCounts, datasets);

  // Validate before writing
  const parsed = catalogSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    throw new Error(`Generated snapshot failed validation:\n${parsed.error.message}`);
  }

  // Write
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  process.stdout.write(
    [
      "",
      "=== Done ===",
      `Datasets : ${snapshot.meta.datasetCount}`,
      `Tags     : ${snapshot.meta.tagCount}`,
      `Orgs     : ${snapshot.meta.orgCount}`,
      `Time     : ${elapsed}s`,
      `Output   : ${OUT_PATH}`,
      "",
      "Commit src/data/catalog/catalog.snapshot.json and rebuild:",
      "  git add src/data/catalog/catalog.snapshot.json",
      "  npm run build",
      "",
    ].join("\n"),
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`[catalog:refresh] Fatal: ${String(err)}\n`);
  process.exit(1);
});
