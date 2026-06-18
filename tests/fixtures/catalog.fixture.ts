/**
 * Minimal hand-crafted catalog snapshot for unit tests.
 * Small enough to reason about manually, large enough to exercise indexes.
 */
import type { CatalogSnapshot } from "../../src/catalog/types.js";
import { SNAPSHOT_SCHEMA_VERSION } from "../../src/catalog/snapshot.schema.js";

export const FIXTURE_SNAPSHOT: CatalogSnapshot = {
  meta: {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: "2026-01-01T00:00:00.000Z",
    ckanBaseUrl: "https://data.gov.il/api/3/action",
    datasetCount: 5,
    tagCount: 5,
    orgCount: 2,
  },
  datasets: [
    {
      id: "ds-001",
      name: "bank-branches",
      title: "סניפי בנקים",
      notes: "רשימת כל סניפי הבנקים בישראל",
      org: "bank-of-israel",
      orgTitle: "בנק ישראל",
      tags: ["אוצר וכלכלה", "בנקים"],
      formats: ["CSV"],
      numResources: 2,
      modified: "2026-01-10T00:00:00.000Z",
    },
    {
      id: "ds-002",
      name: "air-quality",
      title: "איכות אוויר",
      notes: "נתוני ניטור איכות אוויר מתחנות ברחבי הארץ",
      org: "env-ministry",
      orgTitle: "המשרד להגנת הסביבה",
      tags: ["סביבה", "איכות אוויר"],
      formats: ["CSV", "JSON"],
      numResources: 3,
      modified: "2026-01-05T00:00:00.000Z",
    },
    {
      id: "ds-003",
      name: "budget-2025",
      title: "תקציב המדינה 2025",
      notes: "נתוני תקציב המדינה לשנת 2025",
      org: "finance-ministry",
      orgTitle: "משרד האוצר",
      tags: ["אוצר וכלכלה", "תקציב"],
      formats: ["XLSX"],
      numResources: 1,
      modified: "2025-12-01T00:00:00.000Z",
    },
    {
      id: "ds-004",
      name: "public-transport",
      title: "תחבורה ציבורית - לוחות זמנים",
      notes: "לוחות זמנים של תחבורה ציבורית",
      org: "transport-ministry",
      orgTitle: "משרד התחבורה",
      tags: ["תחבורה", "תחבורה ציבורית"],
      formats: ["GTFS"],
      numResources: 5,
      modified: "2026-01-15T00:00:00.000Z",
    },
    {
      id: "ds-005",
      name: "population-stats",
      title: "סטטיסטיקת אוכלוסיה",
      notes: "נתוני אוכלוסיה ממרשם התושבים",
      org: "cbs",
      orgTitle: "הלשכה המרכזית לסטטיסטיקה",
      tags: ["אוכלוסיה", "דמוגרפיה"],
      formats: ["CSV", "XLSX"],
      numResources: 4,
      modified: "2025-11-01T00:00:00.000Z",
    },
  ],
  tags: [
    { name: "אוצר וכלכלה", count: 2 },
    { name: "סביבה", count: 1 },
    { name: "תחבורה", count: 1 },
    { name: "אוכלוסיה", count: 1 },
    { name: "בנקים", count: 1 },
  ],
  orgs: [
    { name: "bank-of-israel", title: "בנק ישראל", count: 1 },
    { name: "env-ministry", title: "המשרד להגנת הסביבה", count: 1 },
    { name: "finance-ministry", title: "משרד האוצר", count: 1 },
    { name: "transport-ministry", title: "משרד התחבורה", count: 1 },
    { name: "cbs", title: "הלשכה המרכזית לסטטיסטיקה", count: 1 },
  ],
};
