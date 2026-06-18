/**
 * CatalogService — the single entry point for the Catalog Discovery Layer.
 *
 * Constructed once at startup from the committed snapshot; all public methods
 * run in-memory against pre-built indexes. No network I/O.
 */
import type { DatasetSummary, TagStat, OrgStat, CatalogSnapshot } from "./types.js";
import { buildIndexes } from "./indexes.js";
import {
  searchDatasets,
  completeDatasetName,
  searchTags,
  type SearchOptions,
} from "./search.js";
import type { ResourceListItem } from "../resources/resource.interface.js";

export type { SearchOptions };

export class CatalogService {
  private readonly snapshot: CatalogSnapshot;
  private readonly idx: ReturnType<typeof buildIndexes>;

  constructor(snapshot: CatalogSnapshot) {
    this.snapshot = snapshot;
    this.idx = buildIndexes(snapshot);
  }

  /** True when the snapshot is the empty placeholder (refresh not yet run). */
  isEmpty(): boolean {
    return this.snapshot.datasets.length === 0;
  }

  // ── Dataset enumeration ──────────────────────────────────────────────────

  /**
   * Returns all dataset summaries, optionally filtered by organization slug.
   * Order matches the snapshot (newest modified first).
   */
  allDatasets(orgFilter?: string): DatasetSummary[] {
    if (!orgFilter) return this.snapshot.datasets;
    const slug = orgFilter.trim().toLowerCase();
    return this.snapshot.datasets.filter((ds) => ds.org.toLowerCase() === slug);
  }

  // ── Dataset search ───────────────────────────────────────────────────────

  search(query: string, options: SearchOptions = {}): DatasetSummary[] {
    return searchDatasets(query, this.snapshot, this.idx, options);
  }

  // ── Completions & resource listing ──────────────────────────────────────

  /** Returns dataset name slugs matching the given prefix (fuzzy fallback). */
  completeDatasetName(prefix: string, limit = 10): string[] {
    return completeDatasetName(prefix, this.idx, limit);
  }

  /**
   * Returns a curated list of datasets for the MCP resource listing.
   * Sorted by richness (tag count + resource count) for discoverability.
   */
  listDatasetResources(limit = 50): ResourceListItem[] {
    return [...this.idx.byName.values()]
      .sort(
        (a, b) =>
          b.tags.length - a.tags.length ||
          b.numResources - a.numResources,
      )
      .slice(0, limit)
      .map((ds) => ({
        uri: `datagov://dataset/${ds.name}`,
        name: ds.name,
        title: ds.title,
        description: ds.notes.slice(0, 150) || undefined,
        mimeType: "application/json" as const,
      }));
  }

  // ── Tags ─────────────────────────────────────────────────────────────────

  /** Top N tags sorted by real dataset count from the catalog. */
  rankedTags(limit = 50): TagStat[] {
    return this.snapshot.tags.slice(0, limit);
  }

  searchTags(keyword: string, limit = 30): TagStat[] {
    return searchTags(keyword, this.snapshot, this.idx, limit);
  }

  /**
   * Returns tags most frequently co-occurring with the given tag,
   * ranked by shared dataset count.
   */
  relatedTags(tag: string, limit = 10): Array<{ tag: string; count: number }> {
    const coMap = this.idx.tagCoOccurrence.get(tag);
    if (!coMap) return [];
    return [...coMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([t, count]) => ({ tag: t, count }));
  }

  // ── Organizations ────────────────────────────────────────────────────────

  organizations(limit = 50): OrgStat[] {
    return this.snapshot.orgs.slice(0, limit);
  }

  // ── Catalog metadata ─────────────────────────────────────────────────────

  stats() {
    return this.snapshot.meta;
  }
}
