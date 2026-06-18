/**
 * In-memory search, completion, and tag lookup for the Catalog Discovery Layer.
 *
 * Scoring is a weighted combination of three signals:
 *  1. Exact / token match  — strongest signal, catches precise queries
 *  2. Tag co-occurrence    — query expansion (e.g. "תחבורה" also surfacing "תנועה")
 *  3. Trigram fuzzy        — resilience to typos, partial words, Hebrew morphology
 */
import type { DatasetSummary, TagStat, CatalogSnapshot, CatalogIndexes } from "./types.js";
import { normalize, tokenize } from "./text.js";
import { trigramSimilarity, trigramCandidates } from "./fuzzy.js";

/** Tunable score weights. Higher = more influence on ranking. */
const W = {
  titleExactFull: 20,
  titleExactPartial: 10,
  titleToken: 5,
  tagExactFull: 8,
  tagToken: 4,
  orgPartial: 2,
  notesToken: 1,
  fuzzy: 3,
} as const;

export interface SearchOptions {
  /** Exact tag name filter. Falls back to fuzzy tag expansion when the tag isn't found. */
  tags?: string;
  limit?: number;
  offset?: number;
}

// ── Scoring ────────────────────────────────────────────────────────────────

function scoreDataset(
  ds: DatasetSummary,
  queryNorm: string,
  queryTokens: string[],
): number {
  let score = 0;

  const titleNorm = normalize(ds.title);
  const nameNorm = normalize(ds.name);
  const notesNorm = normalize(ds.notes);

  // Title exact / partial
  if (titleNorm === queryNorm) score += W.titleExactFull;
  else if (titleNorm.includes(queryNorm)) score += W.titleExactPartial;

  // Token matches in title and notes
  for (const tok of queryTokens) {
    if (titleNorm.includes(tok)) score += W.titleToken;
    if (notesNorm.includes(tok)) score += W.notesToken;
  }

  // Tag matches
  for (const tag of ds.tags) {
    const tagNorm = normalize(tag);
    if (tagNorm === queryNorm) {
      score += W.tagExactFull;
    } else {
      for (const tok of queryTokens) {
        if (tagNorm.includes(tok)) score += W.tagToken;
      }
    }
  }

  // Org match
  const orgNorm = normalize(ds.org);
  const orgTitleNorm = normalize(ds.orgTitle);
  if (orgNorm.includes(queryNorm) || orgTitleNorm.includes(queryNorm)) {
    score += W.orgPartial;
  }

  // Trigram fuzzy on title + name (handles typos, partial tokens, Hebrew morphology)
  const titleSim = trigramSimilarity(queryNorm, titleNorm);
  const nameSim = trigramSimilarity(queryNorm, nameNorm);
  score += Math.max(titleSim, nameSim) * W.fuzzy;

  return score;
}

// ── Dataset search ─────────────────────────────────────────────────────────

export function searchDatasets(
  query: string,
  snapshot: CatalogSnapshot,
  indexes: CatalogIndexes,
  options: SearchOptions = {},
): DatasetSummary[] {
  const queryNorm = normalize(query);
  const queryTokens = tokenize(query);
  const { tags, limit = 20, offset = 0 } = options;

  if (queryNorm.length === 0) return [];

  let pool: DatasetSummary[];

  if (tags) {
    // Exact tag filter first
    const exact = indexes.tagToDatasets.get(tags);
    if (exact && exact.length > 0) {
      pool = exact;
    } else {
      // Fuzzy tag expansion: find tags similar to the requested one
      const candidateTagNames = trigramCandidates(tags, indexes.tagTrigrams);
      const expandedDatasets = new Map<string, DatasetSummary>();
      for (const tagName of candidateTagNames) {
        if (trigramSimilarity(tags, tagName) > 0.4) {
          for (const ds of indexes.tagToDatasets.get(tagName) ?? []) {
            expandedDatasets.set(ds.name, ds);
          }
        }
      }
      pool = [...expandedDatasets.values()];
    }
  } else {
    // Gather trigram candidates across the query and all its tokens
    const candidateNames = trigramCandidates(queryNorm, indexes.datasetTrigrams);
    for (const tok of queryTokens) {
      for (const name of trigramCandidates(tok, indexes.datasetTrigrams)) {
        candidateNames.add(name);
      }
    }

    if (candidateNames.size > 0) {
      pool = [...candidateNames]
        .map((name) => indexes.byName.get(name))
        .filter((ds): ds is DatasetSummary => ds !== undefined);
    } else {
      // No trigram hits (very short or unusual query) → score entire catalog
      pool = snapshot.datasets;
    }
  }

  const scored = pool
    .map((ds) => ({ ds, score: scoreDataset(ds, queryNorm, queryTokens) }))
    .filter((s) => s.score > 0)
    .sort((a, b) =>
      b.score !== a.score
        ? b.score - a.score
        : b.ds.modified.localeCompare(a.ds.modified),
    );

  return scored.slice(offset, offset + limit).map((s) => s.ds);
}

// ── Dataset name completion ────────────────────────────────────────────────

export function completeDatasetName(
  prefix: string,
  indexes: CatalogIndexes,
  limit = 10,
): string[] {
  const normPrefix = normalize(prefix);

  if (!normPrefix) {
    return [...indexes.byName.keys()].slice(0, limit);
  }

  // 1. Exact prefix matches on name
  const exact: string[] = [];
  for (const name of indexes.byName.keys()) {
    if (normalize(name).startsWith(normPrefix)) {
      exact.push(name);
      if (exact.length >= limit) return exact;
    }
  }

  // 2. Fuzzy fallback for remaining slots
  const needed = limit - exact.length;
  const seen = new Set(exact);
  const candidates = trigramCandidates(prefix, indexes.datasetTrigrams);
  const fuzzyScored: Array<{ name: string; score: number }> = [];

  for (const name of candidates) {
    if (seen.has(name)) continue;
    const score = trigramSimilarity(prefix, name);
    if (score > 0.25) fuzzyScored.push({ name, score });
  }

  fuzzyScored.sort((a, b) => b.score - a.score);
  return [...exact, ...fuzzyScored.slice(0, needed).map((s) => s.name)];
}

// ── Tag search ─────────────────────────────────────────────────────────────

export function searchTags(
  keyword: string,
  snapshot: CatalogSnapshot,
  indexes: CatalogIndexes,
  limit = 30,
): TagStat[] {
  const keyNorm = normalize(keyword);
  if (!keyNorm) return snapshot.tags.slice(0, limit);

  // Substring matches (snapshot.tags is sorted by count desc)
  const exact = snapshot.tags.filter((t) => normalize(t.name).includes(keyNorm));
  if (exact.length >= limit) return exact.slice(0, limit);

  // Fuzzy matches for remaining slots
  const needed = limit - exact.length;
  const seen = new Set(exact.map((t) => t.name));
  const candidates = trigramCandidates(keyword, indexes.tagTrigrams);
  const fuzzyScored: Array<{ tag: TagStat; score: number }> = [];

  for (const tagName of candidates) {
    if (seen.has(tagName)) continue;
    const tag = indexes.tagsByName.get(tagName);
    if (!tag) continue;
    const score = trigramSimilarity(keyword, tagName);
    if (score > 0.3) fuzzyScored.push({ tag, score });
  }

  fuzzyScored.sort((a, b) => b.score - a.score);
  return [...exact, ...fuzzyScored.slice(0, needed).map((f) => f.tag)];
}
