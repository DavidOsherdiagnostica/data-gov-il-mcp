/**
 * Tests for the CatalogService tag and discovery methods.
 * Replaces the old TagsService tests (taxonomy removed in favour of the catalog layer).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { CatalogService } from "../../src/catalog/catalog.service.js";
import { FIXTURE_SNAPSHOT } from "../fixtures/catalog.fixture.js";

describe("CatalogService — tag methods", () => {
  let service: CatalogService;

  beforeEach(() => {
    service = new CatalogService(FIXTURE_SNAPSHOT);
  });

  it("rankedTags returns tags sorted by count descending", () => {
    const tags = service.rankedTags(10);
    expect(tags.length).toBeGreaterThan(0);
    for (let i = 0; i < tags.length - 1; i++) {
      expect(tags[i]!.count).toBeGreaterThanOrEqual(tags[i + 1]!.count);
    }
  });

  it("rankedTags respects limit", () => {
    const tags = service.rankedTags(2);
    expect(tags.length).toBeLessThanOrEqual(2);
  });

  it("searchTags finds by substring", () => {
    const results = service.searchTags("תחבורה");
    expect(results.some((t) => t.name.includes("תחבורה"))).toBe(true);
  });

  it("searchTags returns results for empty keyword (popular fallback)", () => {
    const results = service.searchTags("", 5);
    expect(results.length).toBeGreaterThan(0);
  });

  it("searchTags fuzzy: near-typo still finds a tag", () => {
    const results = service.searchTags("סביב");
    const names = results.map((r) => r.name);
    expect(names).toContain("סביבה");
  });

  it("relatedTags returns co-occurring tags", () => {
    const related = service.relatedTags("אוצר וכלכלה");
    expect(related.length).toBeGreaterThan(0);
    // "בנקים" and "תקציב" both co-occur with "אוצר וכלכלה"
    const relatedNames = related.map((r) => r.tag);
    expect(relatedNames).toContain("בנקים");
    expect(relatedNames).toContain("תקציב");
  });

  it("relatedTags returns empty array for unknown tag", () => {
    expect(service.relatedTags("nonexistent-tag")).toEqual([]);
  });

  it("relatedTags respects limit", () => {
    const related = service.relatedTags("אוצר וכלכלה", 1);
    expect(related.length).toBeLessThanOrEqual(1);
  });
});

describe("CatalogService — dataset methods", () => {
  let service: CatalogService;

  beforeEach(() => {
    service = new CatalogService(FIXTURE_SNAPSHOT);
  });

  it("search finds dataset by Hebrew title", () => {
    const results = service.search("סניפי בנקים");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe("bank-branches");
  });

  it("completeDatasetName prefix match", () => {
    const names = service.completeDatasetName("bank");
    expect(names).toContain("bank-branches");
  });

  it("completeDatasetName fuzzy fallback", () => {
    // "branc" shares trigrams bra/ran/anc with "bank branches" (Dice > 0.25)
    const names = service.completeDatasetName("branc");
    expect(names).toContain("bank-branches");
  });

  it("listDatasetResources returns ResourceListItem array", () => {
    const items = service.listDatasetResources(10);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.uri).toMatch(/^datagov:\/\/dataset\//);
      expect(item.name).toBeTruthy();
    }
  });

  it("isEmpty returns false for non-empty snapshot", () => {
    expect(service.isEmpty()).toBe(false);
  });

  it("stats returns catalog metadata", () => {
    const stats = service.stats();
    expect(stats.schemaVersion).toBe(1);
    expect(stats.datasetCount).toBe(FIXTURE_SNAPSHOT.datasets.length);
  });
});

describe("CatalogService — empty snapshot", () => {
  it("isEmpty returns true for empty snapshot", () => {
    const empty = new CatalogService({
      meta: {
        schemaVersion: 1,
        generatedAt: "1970-01-01T00:00:00.000Z",
        ckanBaseUrl: "https://data.gov.il/api/3/action",
        datasetCount: 0,
        tagCount: 0,
        orgCount: 0,
      },
      datasets: [],
      tags: [],
      orgs: [],
    });
    expect(empty.isEmpty()).toBe(true);
    expect(empty.rankedTags()).toHaveLength(0);
    expect(empty.search("test")).toHaveLength(0);
  });
});
