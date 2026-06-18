/**
 * Tests for text normalization and trigram generation.
 */
import { describe, it, expect } from "vitest";
import { normalize, trigrams, tokenize } from "../../src/catalog/text.js";

describe("normalize", () => {
  it("lowercases ASCII", () => {
    expect(normalize("GIS")).toBe("gis");
  });

  it("strips nikud (Hebrew vowel marks)", () => {
    // שָׁלוֹם has nikud on each letter; after stripping nikud the base letters remain.
    // The final letter ם is also normalized to מ, so the result is שלומ.
    expect(normalize("שָׁלוֹם")).toBe("שלומ");
  });

  it("unifies Hebrew final letters", () => {
    expect(normalize("ךםןףץ")).toBe("כמנפצ");
  });

  it("replaces punctuation with spaces", () => {
    expect(normalize("a,b.c!d")).toBe("a b c d");
  });

  it("collapses multiple spaces", () => {
    expect(normalize("  hello   world  ")).toBe("hello world");
  });

  it("handles mixed Hebrew and English", () => {
    const result = normalize("תחבורה ציבורית - Public Transport");
    expect(result).toContain("תחבורה");
    expect(result).toContain("public");
    expect(result).toContain("transport");
  });

  it("returns empty string for empty input", () => {
    expect(normalize("")).toBe("");
  });
});

describe("trigrams", () => {
  it("generates trigrams for a 5-char string", () => {
    const tgs = trigrams("abcde");
    expect(tgs).toEqual(["abc", "bcd", "cde"]);
  });

  it("returns the whole string for inputs shorter than 3 chars", () => {
    expect(trigrams("ab")).toEqual(["ab"]);
    expect(trigrams("a")).toEqual(["a"]);
  });

  it("returns empty array for empty string", () => {
    expect(trigrams("")).toEqual([]);
  });

  it("normalizes before generating trigrams", () => {
    // ם is final mem → normalizes to מ
    const tgs = trigrams("שלום");
    expect(tgs).not.toContain("לום");
    expect(tgs).toContain("לומ"); // after final-letter normalization
  });

  it("produces consistent results for equivalent inputs", () => {
    // Hebrew final-letter normalization ensures שלום and שלומ produce same trigrams
    const a = new Set(trigrams("שלום"));
    const b = new Set(trigrams("שלומ"));
    expect(a).toEqual(b);
  });
});

describe("tokenize", () => {
  it("splits on whitespace and filters single-char tokens", () => {
    const tokens = tokenize("a bc def");
    expect(tokens).not.toContain("a");
    expect(tokens).toContain("bc");
    expect(tokens).toContain("def");
  });

  it("returns empty array for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("normalizes before tokenizing", () => {
    const tokens = tokenize("Public Transport תחבורה");
    expect(tokens).toContain("public");
    expect(tokens).toContain("transport");
    expect(tokens).toContain("תחבורה");
  });
});
