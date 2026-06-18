/**
 * Trigram-based fuzzy similarity and candidate retrieval.
 *
 * Using the Dice coefficient: 2|A∩B| / (|A|+|B|)
 * Combined with an inverted trigram index to avoid O(n) scans.
 */
import { trigrams } from "./text.js";

/**
 * Dice coefficient between two strings' trigram multisets.
 * Returns a value in [0, 1] where 1 = identical normalized trigrams.
 */
export function trigramSimilarity(a: string, b: string): number {
  const setA = new Set(trigrams(a));
  const setB = new Set(trigrams(b));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Returns the set of all item IDs from the inverted index that share at
 * least one trigram with the query. Only these candidates need full scoring.
 */
export function trigramCandidates<T>(
  query: string,
  index: Map<string, Set<T>>,
): Set<T> {
  const result = new Set<T>();
  for (const tg of trigrams(query)) {
    const bucket = index.get(tg);
    if (bucket) {
      for (const id of bucket) result.add(id);
    }
  }
  return result;
}
