/**
 * Type definitions for the Catalog Discovery Layer.
 *
 * Snapshot types  → the committed artifact shape (serialized to JSON).
 * In-memory types → runtime indexes built once at startup, never serialized.
 */

/** Condensed dataset entry stored in the committed snapshot. */
export interface DatasetSummary {
  id: string;
  name: string;
  title: string;
  /** Truncated description (~300 chars). Empty string when none. */
  notes: string;
  /** Organization slug, e.g. "ministry-of-health". Empty string when none. */
  org: string;
  orgTitle: string;
  /** All tag names attached to this dataset. */
  tags: string[];
  /** Distinct resource formats, e.g. ["CSV", "JSON"]. */
  formats: string[];
  numResources: number;
  /** ISO 8601 date string of last modification. */
  modified: string;
}

export interface TagStat {
  name: string;
  count: number;
}

export interface OrgStat {
  name: string;
  title: string;
  count: number;
}

export interface CatalogMeta {
  /**
   * Increment when the snapshot shape changes — zod uses this to reject stale
   * artifacts and prompt a re-refresh.
   */
  schemaVersion: 1;
  /** ISO 8601 timestamp of when the snapshot was generated. */
  generatedAt: string;
  ckanBaseUrl: string;
  datasetCount: number;
  tagCount: number;
  orgCount: number;
}

/** The committed snapshot artifact (validated by zod at load time). */
export interface CatalogSnapshot {
  meta: CatalogMeta;
  /** All datasets, ordered as returned by CKAN (newest first). */
  datasets: DatasetSummary[];
  /** All tags, sorted by count descending. */
  tags: TagStat[];
  /** All organizations, sorted by dataset count descending. */
  orgs: OrgStat[];
}

/** All in-memory indexes derived from the snapshot at startup. Never serialized. */
export interface CatalogIndexes {
  byName: Map<string, DatasetSummary>;
  byId: Map<string, DatasetSummary>;
  tagsByName: Map<string, TagStat>;
  tagToDatasets: Map<string, DatasetSummary[]>;
  orgToDatasets: Map<string, DatasetSummary[]>;
  /** tag → Map<co-occurring tag, shared dataset count> */
  tagCoOccurrence: Map<string, Map<string, number>>;
  /** Trigram inverted index for dataset name+title: trigram → Set<dataset.name> */
  datasetTrigrams: Map<string, Set<string>>;
  /** Trigram inverted index for tag names: trigram → Set<tag.name> */
  tagTrigrams: Map<string, Set<string>>;
}
