/**
 * Tests for in-memory search, completion, and tag lookup.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { searchDatasets, completeDatasetName, searchTags } from "../../src/catalog/search.js";
import { buildIndexes } from "../../src/catalog/indexes.js";
import type { CatalogIndexes } from "../../src/catalog/types.js";
import { FIXTURE_SNAPSHOT } from "../fixtures/catalog.fixture.js";

describe("searchDatasets", () => {
  let idx: CatalogIndexes;

  beforeEach(() => {
    idx = buildIndexes(FIXTURE_SNAPSHOT);
  });

  it("returns empty array for empty query", () => {
    const results = searchDatasets("", FIXTURE_SNAPSHOT, idx);
    expect(results).toHaveLength(0);
  });

  it("finds dataset by exact Hebrew title", () => {
    const results = searchDatasets("סניפי בנקים", FIXTURE_SNAPSHOT, idx);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe("bank-branches");
  });

  it("finds dataset by English slug word", () => {
    const results = searchDatasets("bank", FIXTURE_SNAPSHOT, idx);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe("bank-branches");
  });

  it("finds dataset by partial title word", () => {
    const results = searchDatasets("תחבורה", FIXTURE_SNAPSHOT, idx);
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((r) => r.name);
    expect(names).toContain("public-transport");
  });

  it("finds dataset by tag", () => {
    const results = searchDatasets("סביבה", FIXTURE_SNAPSHOT, idx);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe("air-quality");
  });

  it("applies tag filter via options.tags", () => {
    const results = searchDatasets("לוחות זמנים", FIXTURE_SNAPSHOT, idx, {
      tags: "תחבורה",
    });
    // "לוחות זמנים" appears in public-transport's notes and title;
    // with the tag filter active, budget-2025 (also tagged אוצר) must not appear.
    const names = results.map((r) => r.name);
    expect(names).toContain("public-transport");
    expect(names).not.toContain("budget-2025");
  });

  it("respects limit option", () => {
    const results = searchDatasets("ת", FIXTURE_SNAPSHOT, idx, { limit: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("respects offset option", () => {
    const all = searchDatasets("נתוני", FIXTURE_SNAPSHOT, idx, { limit: 10 });
    const paged = searchDatasets("נתוני", FIXTURE_SNAPSHOT, idx, {
      limit: 10,
      offset: 1,
    });
    if (all.length > 1) {
      expect(paged[0]?.name).toBe(all[1]?.name);
    }
  });

  it("handles fuzzy match (partial word / typo)", () => {
    // "בנקי" instead of "בנקים" — fuzzy should still find bank-branches
    const results = searchDatasets("בנקי", FIXTURE_SNAPSHOT, idx);
    const names = results.map((r) => r.name);
    expect(names).toContain("bank-branches");
  });

  it("returns results sorted by score (higher score first)", () => {
    const results = searchDatasets("תקציב", FIXTURE_SNAPSHOT, idx);
    expect(results.length).toBeGreaterThan(0);
    // budget-2025 has "תקציב" in both tags and title
    expect(results[0]?.name).toBe("budget-2025");
  });
});

describe("completeDatasetName", () => {
  let idx: CatalogIndexes;

  beforeEach(() => {
    idx = buildIndexes(FIXTURE_SNAPSHOT);
  });

  it("returns names starting with prefix", () => {
    const results = completeDatasetName("bank", idx);
    expect(results).toContain("bank-branches");
  });

  it("returns up to limit results", () => {
    const results = completeDatasetName("", idx, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("falls back to fuzzy match when no prefix match", () => {
    // "branc" won't prefix-match any dataset name but shares trigrams "bra","ran","anc"
    // with "bank-branches" (normalized: "bank branches"), giving Dice > 0.25
    const results = completeDatasetName("branc", idx, 5);
    expect(results).toContain("bank-branches");
  });

  it("returns dataset names for empty prefix", () => {
    const results = completeDatasetName("", idx, 10);
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("searchTags", () => {
  let idx: CatalogIndexes;

  beforeEach(() => {
    idx = buildIndexes(FIXTURE_SNAPSHOT);
  });

  it("finds tag by exact substring", () => {
    const results = searchTags("תחבורה", FIXTURE_SNAPSHOT, idx);
    const names = results.map((r) => r.name);
    expect(names.some((n) => n.includes("תחבורה"))).toBe(true);
  });

  it("returns popular tags for empty keyword", () => {
    const results = searchTags("", FIXTURE_SNAPSHOT, idx);
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns fuzzy match for near-typo", () => {
    // "סביב" instead of "סביבה" — should still find the tag
    const results = searchTags("סביב", FIXTURE_SNAPSHOT, idx);
    const names = results.map((r) => r.name);
    expect(names).toContain("סביבה");
  });

  it("respects limit", () => {
    const results = searchTags("", FIXTURE_SNAPSHOT, idx, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });
});
