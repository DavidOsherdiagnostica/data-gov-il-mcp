/**
 * Loads and validates the committed catalog snapshot at module initialization.
 *
 * If the snapshot fails schema validation, the server will refuse to start
 * and print an actionable message asking the operator to run catalog:refresh.
 *
 * tsup/esbuild inlines the JSON at bundle time so the distribution artifact
 * is fully self-contained.
 */
import { catalogSnapshotSchema } from "./snapshot.schema.js";
import type { CatalogSnapshot } from "./types.js";
import rawSnapshot from "../data/catalog/catalog.snapshot.json" with { type: "json" };

const parsed = catalogSnapshotSchema.safeParse(rawSnapshot);

if (!parsed.success) {
  throw new Error(
    [
      "catalog.snapshot.json failed schema validation.",
      `Details: ${parsed.error.message}`,
      "Run `npm run catalog:refresh` to regenerate the snapshot, then rebuild.",
    ].join("\n"),
  );
}

export const catalogSnapshot: CatalogSnapshot = parsed.data;
