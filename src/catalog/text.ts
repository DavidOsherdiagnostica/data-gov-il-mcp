/**
 * Text normalization and trigram generation for the Catalog Discovery Layer.
 *
 * Both the indexing side (build indexes) and the query side (score datasets)
 * call the same functions here so matching is always consistent.
 */

/** Maps Hebrew final-form letters to their standard equivalents. */
const FINAL_TO_BASE: Readonly<Record<string, string>> = {
  ך: "כ",
  ם: "מ",
  ן: "נ",
  ף: "פ",
  ץ: "צ",
};

/**
 * Normalizes a string for indexing/querying:
 *  1. Lowercase
 *  2. Strip Hebrew nikud (U+0591–U+05C7)
 *  3. Unify Hebrew final letters (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ)
 *  4. Replace punctuation/symbols with spaces (preserve letters + digits)
 *  5. Collapse whitespace and trim
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[ךםןףץ]/g, (c) => FINAL_TO_BASE[c] ?? c)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates character-level trigrams from a normalized string.
 * For strings shorter than 3 chars, returns the whole string as one token
 * (so 2-char Hebrew words like "אם" still participate in matching).
 */
export function trigrams(str: string): string[] {
  const n = normalize(str);
  if (n.length === 0) return [];
  if (n.length < 3) return [n];
  const result: string[] = [];
  for (let i = 0; i <= n.length - 3; i++) {
    result.push(n.slice(i, i + 3));
  }
  return result;
}

/**
 * Splits normalized text into tokens.
 * Filters single-character tokens (mostly stop particles in Hebrew: ב, ל, ה, ו...).
 */
export function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length >= 2);
}
