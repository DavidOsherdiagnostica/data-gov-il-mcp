/**
 * Tests for the datasets domain service.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { DatasetsService } from "../../src/services/datasets.service.js";
import { MemoryCache } from "../../src/cache/memory-cache.js";
import { FIXTURE_DATASET, FIXTURE_PACKAGE_SEARCH } from "../fixtures/ckan-dataset.fixture.js";
import pino from "pino";

const logger = pino({ level: "silent" });

describe("DatasetsService", () => {
  let mockCkan: { get: Mock };
  let cache: MemoryCache;
  let service: DatasetsService;

  beforeEach(() => {
    mockCkan = { get: vi.fn() };
    cache = new MemoryCache({ defaultTtlMs: 60_000, maxItems: 100 });
    service = new DatasetsService(mockCkan as never, cache, logger);
  });

  describe("search()", () => {
    it("calls package_search with query", async () => {
      mockCkan.get.mockResolvedValue(FIXTURE_PACKAGE_SEARCH);

      const result = await service.search({ query: "branches", sort: undefined, tags: undefined });

      expect(mockCkan.get).toHaveBeenCalledWith(
        "package_search",
        expect.objectContaining({ q: "branches" }),
      );
      expect(result.count).toBe(2);
    });

    it("appends sort param when provided", async () => {
      mockCkan.get.mockResolvedValue(FIXTURE_PACKAGE_SEARCH);

      await service.search({ query: "test", sort: "newest", tags: undefined });

      expect(mockCkan.get).toHaveBeenCalledWith(
        "package_search",
        expect.objectContaining({
          q: "test",
          sort: "metadata_created desc",
        }),
      );
    });

    it("appends fq filter when tags provided", async () => {
      mockCkan.get.mockResolvedValue(FIXTURE_PACKAGE_SEARCH);

      await service.search({ query: "test", sort: undefined, tags: "תחבורה" });

      expect(mockCkan.get).toHaveBeenCalledWith(
        "package_search",
        expect.objectContaining({ fq: 'tags:"תחבורה"' }),
      );
    });
  });

  describe("getInfo()", () => {
    it("calls package_show with dataset id", async () => {
      mockCkan.get.mockResolvedValue(FIXTURE_DATASET);

      const result = await service.getInfo("branches");

      expect(mockCkan.get).toHaveBeenCalledWith("package_show", { id: "branches" });
      expect(result.name).toBe("branches");
    });

    it("includes tracking when requested", async () => {
      mockCkan.get.mockResolvedValue(FIXTURE_DATASET);

      await service.getInfo("branches", true);

      expect(mockCkan.get).toHaveBeenCalledWith("package_show", {
        id: "branches",
        include_tracking: "true",
      });
    });
  });

  describe("listAll()", () => {
    it("returns cached result on second call", async () => {
      mockCkan.get.mockResolvedValue(["dataset-1", "dataset-2"]);

      await service.listAll();
      await service.listAll();

      expect(mockCkan.get).toHaveBeenCalledOnce();
    });
  });
});
