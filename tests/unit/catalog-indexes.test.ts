/**
 * Tests for in-memory index building (maps, co-occurrence, trigram indexes).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { buildIndexes } from "../../src/catalog/indexes.js";
import type { CatalogIndexes } from "../../src/catalog/types.js";
import { FIXTURE_SNAPSHOT } from "../fixtures/catalog.fixture.js";

describe("buildIndexes", () => {
  let idx: CatalogIndexes;

  beforeEach(() => {
    idx = buildIndexes(FIXTURE_SNAPSHOT);
  });

  describe("byName / byId", () => {
    it("indexes all datasets by name", () => {
      expect(idx.byName.size).toBe(FIXTURE_SNAPSHOT.datasets.length);
      expect(idx.byName.has("bank-branches")).toBe(true);
      expect(idx.byName.has("air-quality")).toBe(true);
    });

    it("indexes all datasets by id", () => {
      expect(idx.byId.size).toBe(FIXTURE_SNAPSHOT.datasets.length);
      expect(idx.byId.has("ds-001")).toBe(true);
    });

    it("resolves name to dataset", () => {
      const ds = idx.byName.get("bank-branches");
      expect(ds?.title).toBe("סניפי בנקים");
    });
  });

  describe("tagsByName", () => {
    it("indexes all tags", () => {
      expect(idx.tagsByName.size).toBe(FIXTURE_SNAPSHOT.tags.length);
    });

    it("resolves tag to stat", () => {
      const tag = idx.tagsByName.get("אוצר וכלכלה");
      expect(tag?.count).toBe(2);
    });
  });

  describe("tagToDatasets", () => {
    it("maps tag to its datasets", () => {
      const ds = idx.tagToDatasets.get("אוצר וכלכלה");
      expect(ds).toBeDefined();
      expect(ds?.length).toBe(2);
    });

    it("handles tags with one dataset", () => {
      const ds = idx.tagToDatasets.get("בנקים");
      expect(ds?.length).toBe(1);
      expect(ds?.[0]?.name).toBe("bank-branches");
    });
  });

  describe("orgToDatasets", () => {
    it("maps org to its datasets", () => {
      const ds = idx.orgToDatasets.get("bank-of-israel");
      expect(ds?.length).toBe(1);
    });
  });

  describe("tagCoOccurrence", () => {
    it("records co-occurrence for tags on the same dataset", () => {
      // "אוצר וכלכלה" and "בנקים" co-occur on bank-branches
      const coMap = idx.tagCoOccurrence.get("אוצר וכלכלה");
      expect(coMap?.has("בנקים")).toBe(true);
    });

    it("is symmetric", () => {
      const countAB = idx.tagCoOccurrence.get("אוצר וכלכלה")?.get("בנקים") ?? 0;
      const countBA = idx.tagCoOccurrence.get("בנקים")?.get("אוצר וכלכלה") ?? 0;
      expect(countAB).toBe(countBA);
    });

    it("counts multiple co-occurrences correctly", () => {
      // "אוצר וכלכלה" appears on bank-branches (with בנקים) and budget-2025 (with תקציב)
      // It co-occurs with "תקציב" once
      const count = idx.tagCoOccurrence.get("אוצר וכלכלה")?.get("תקציב") ?? 0;
      expect(count).toBe(1);
    });
  });

  describe("datasetTrigrams", () => {
    it("builds trigram index for dataset names", () => {
      // "bank-branches" normalized → "bank branches", trigrams include "ban", "ank", etc.
      expect(idx.datasetTrigrams.size).toBeGreaterThan(0);
    });

    it("trigrams from name map back to dataset name", () => {
      // Find a trigram that appears in "bank-branches"
      const candidates = new Set<string>();
      for (const [tg, bucket] of idx.datasetTrigrams) {
        if (tg === "ban") {
          for (const name of bucket) candidates.add(name);
        }
      }
      expect(candidates.has("bank-branches")).toBe(true);
    });
  });

  describe("tagTrigrams", () => {
    it("builds trigram index for tag names", () => {
      expect(idx.tagTrigrams.size).toBeGreaterThan(0);
    });

    it("tag name trigrams map to the tag name", () => {
      const candidates = new Set<string>();
      for (const [, bucket] of idx.tagTrigrams) {
        for (const name of bucket) candidates.add(name);
      }
      expect(candidates.has("סביבה")).toBe(true);
    });
  });
});
