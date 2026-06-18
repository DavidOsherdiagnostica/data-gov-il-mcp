/**
 * Tests for snapshot zod schema validation.
 */
import { describe, it, expect } from "vitest";
import { catalogSnapshotSchema, SNAPSHOT_SCHEMA_VERSION } from "../../src/catalog/snapshot.schema.js";
import { FIXTURE_SNAPSHOT } from "../fixtures/catalog.fixture.js";

describe("catalogSnapshotSchema", () => {
  it("accepts a valid snapshot", () => {
    const result = catalogSnapshotSchema.safeParse(FIXTURE_SNAPSHOT);
    expect(result.success).toBe(true);
  });

  it("rejects missing meta", () => {
    const bad = { datasets: [], tags: [], orgs: [] };
    const result = catalogSnapshotSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects wrong schemaVersion", () => {
    const bad = {
      ...FIXTURE_SNAPSHOT,
      meta: { ...FIXTURE_SNAPSHOT.meta, schemaVersion: 99 },
    };
    const result = catalogSnapshotSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects negative dataset counts", () => {
    const bad = {
      ...FIXTURE_SNAPSHOT,
      meta: { ...FIXTURE_SNAPSHOT.meta, datasetCount: -1 },
    };
    const result = catalogSnapshotSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects dataset missing required fields", () => {
    const bad = {
      ...FIXTURE_SNAPSHOT,
      datasets: [{ id: "x" }], // missing name, title, etc.
    };
    const result = catalogSnapshotSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("current SNAPSHOT_SCHEMA_VERSION is 1", () => {
    expect(SNAPSHOT_SCHEMA_VERSION).toBe(1);
  });
});
