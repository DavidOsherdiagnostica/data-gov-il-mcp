/**
 * Zod schema for the committed catalog snapshot.
 * Fails fast on load if the artifact is malformed or from an old schema version.
 */
import { z } from "zod";

export const SNAPSHOT_SCHEMA_VERSION = 1 as const;

const datasetSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  notes: z.string(),
  org: z.string(),
  orgTitle: z.string(),
  tags: z.array(z.string()),
  formats: z.array(z.string()),
  numResources: z.number().int().nonnegative(),
  modified: z.string(),
});

const tagStatSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
});

const orgStatSchema = z.object({
  name: z.string(),
  title: z.string(),
  count: z.number().int().nonnegative(),
});

const metaSchema = z.object({
  schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  generatedAt: z.string(),
  ckanBaseUrl: z.string(),
  datasetCount: z.number().int().nonnegative(),
  tagCount: z.number().int().nonnegative(),
  orgCount: z.number().int().nonnegative(),
});

export const catalogSnapshotSchema = z.object({
  meta: metaSchema,
  datasets: z.array(datasetSummarySchema),
  tags: z.array(tagStatSchema),
  orgs: z.array(orgStatSchema),
});
