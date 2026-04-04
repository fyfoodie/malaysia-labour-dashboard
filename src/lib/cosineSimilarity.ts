/**
 * Cosine similarity between two normalized float vectors.
 * Returns a value between -1 and 1 (higher = more similar).
 * Assumes both vectors are already L2-normalized (which MiniLM outputs are).
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot; // already normalized → dot product = cosine similarity
}

/**
 * Find the index of the maximum value in an array.
 */
export function argmax(scores: number[]): number {
  let maxIdx = 0;
  let maxVal = scores[0];
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > maxVal) {
      maxVal = scores[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}