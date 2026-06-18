/**
 * Tests for trigram fuzzy similarity and candidate retrieval.
 */
import { describe, it, expect } from "vitest";
import { trigramSimilarity, trigramCandidates } from "../../src/catalog/fuzzy.js";

describe("trigramSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(trigramSimilarity("תחבורה", "תחבורה")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    expect(trigramSimilarity("abcdef", "xyz")).toBe(0);
  });

  it("returns a high score for minor typo", () => {
    // תחבורה vs תכבורה (one char swap)
    const sim = trigramSimilarity("תחבורה", "תכבורה");
    expect(sim).toBeGreaterThan(0.4);
  });

  it("returns a moderate score for partial match", () => {
    // תחבורה vs תחבורה ציבורית (prefix)
    const sim = trigramSimilarity("תחבורה", "תחבורה ציבורית");
    expect(sim).toBeGreaterThan(0.3);
  });

  it("returns 1 for two empty strings", () => {
    expect(trigramSimilarity("", "")).toBe(1);
  });

  it("returns 0 when one string is empty", () => {
    expect(trigramSimilarity("hello", "")).toBe(0);
    expect(trigramSimilarity("", "hello")).toBe(0);
  });

  it("is symmetric", () => {
    const a = trigramSimilarity("bank", "branch");
    const b = trigramSimilarity("branch", "bank");
    expect(a).toBeCloseTo(b, 10);
  });

  it("handles Hebrew final-letter normalization", () => {
    // שלום ends with ם (final mem), שלומ uses normal mem — should be identical
    expect(trigramSimilarity("שלום", "שלומ")).toBe(1);
  });
});

describe("trigramCandidates", () => {
  it("returns items sharing at least one trigram", () => {
    const index = new Map<string, Set<string>>();
    const addEntry = (text: string, id: string) => {
      // Build a simple trigram index manually
      for (let i = 0; i <= text.length - 3; i++) {
        const tg = text.slice(i, i + 3);
        let bucket = index.get(tg);
        if (!bucket) {
          bucket = new Set();
          index.set(tg, bucket);
        }
        bucket.add(id);
      }
    };

    addEntry("transport", "item-1");
    addEntry("transfer", "item-2");
    addEntry("abcdef", "item-3");

    const candidates = trigramCandidates("transport", index);
    expect(candidates.has("item-1")).toBe(true);
    // "transfer" shares "tra", "ran" → should be a candidate
    expect(candidates.has("item-2")).toBe(true);
    // "abcdef" shares nothing with "transport"
    expect(candidates.has("item-3")).toBe(false);
  });

  it("returns empty set for a query with no matching trigrams", () => {
    const index = new Map<string, Set<string>>();
    const candidates = trigramCandidates("xyz", index);
    expect(candidates.size).toBe(0);
  });
});
