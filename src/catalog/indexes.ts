/**
 * Builds all in-memory indexes from the committed snapshot.
 *
 * Pure function — same snapshot always produces identical indexes.
 * Runs once at server startup; expected runtime < 150ms for ~4 000 datasets.
 */
import type { CatalogSnapshot, CatalogIndexes, DatasetSummary, TagStat } from "./types.js";
import { trigrams } from "./text.js";

function addToTrigrams(
  index: Map<string, Set<string>>,
  text: string,
  id: string,
): void {
  for (const tg of trigrams(text)) {
    let bucket = index.get(tg);
    if (!bucket) {
      bucket = new Set<string>();
      index.set(tg, bucket);
    }
    bucket.add(id);
  }
}

export function buildIndexes(snapshot: CatalogSnapshot): CatalogIndexes {
  const byName = new Map<string, DatasetSummary>();
  const byId = new Map<string, DatasetSummary>();
  const tagsByName = new Map<string, TagStat>();
  const tagToDatasets = new Map<string, DatasetSummary[]>();
  const orgToDatasets = new Map<string, DatasetSummary[]>();
  const tagCoOccurrence = new Map<string, Map<string, number>>();
  const datasetTrigrams = new Map<string, Set<string>>();
  const tagTrigrams = new Map<string, Set<string>>();

  // ── Dataset indexes ────────────────────────────────────────────────────────

  for (const ds of snapshot.datasets) {
    byName.set(ds.name, ds);
    byId.set(ds.id, ds);

    // Org → datasets
    if (ds.org) {
      const list = orgToDatasets.get(ds.org);
      if (list) list.push(ds);
      else orgToDatasets.set(ds.org, [ds]);
    }

    // Tag → datasets
    for (let i = 0; i < ds.tags.length; i++) {
      const tagA = ds.tags[i];
      if (!tagA) continue;

      const tagList = tagToDatasets.get(tagA);
      if (tagList) tagList.push(ds);
      else tagToDatasets.set(tagA, [ds]);

      // Tag co-occurrence (iterate remaining tags to form pairs)
      for (let j = i + 1; j < ds.tags.length; j++) {
        const tagB = ds.tags[j];
        if (!tagB) continue;

        // A → B
        let mapA = tagCoOccurrence.get(tagA);
        if (!mapA) {
          mapA = new Map<string, number>();
          tagCoOccurrence.set(tagA, mapA);
        }
        mapA.set(tagB, (mapA.get(tagB) ?? 0) + 1);

        // B → A
        let mapB = tagCoOccurrence.get(tagB);
        if (!mapB) {
          mapB = new Map<string, number>();
          tagCoOccurrence.set(tagB, mapB);
        }
        mapB.set(tagA, (mapB.get(tagA) ?? 0) + 1);
      }
    }

    // Trigram index: name + title both map to dataset.name as the lookup key
    addToTrigrams(datasetTrigrams, ds.name, ds.name);
    addToTrigrams(datasetTrigrams, ds.title, ds.name);
  }

  // ── Tag indexes ────────────────────────────────────────────────────────────

  for (const tag of snapshot.tags) {
    tagsByName.set(tag.name, tag);
    addToTrigrams(tagTrigrams, tag.name, tag.name);
  }

  return {
    byName,
    byId,
    tagsByName,
    tagToDatasets,
    orgToDatasets,
    tagCoOccurrence,
    datasetTrigrams,
    tagTrigrams,
  };
}
