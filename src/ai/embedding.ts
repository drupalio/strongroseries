import type { ScoredResult } from "./models.ts";

const cache = new Map<string, Float32Array>();

export function embed(text: string | null | undefined): Float32Array {
  if (!text || text.trim().length === 0) return new Float32Array(0);
  const normalized = text.toLowerCase().trim();
  const cached = cache.get(normalized);
  if (cached) return cached;
  const v = computeEmbedding(normalized);
  cache.set(normalized, v);
  return v;
}

const VEC_DIM = 128;

function computeEmbedding(text: string): Float32Array {
  const bigrams = charBigrams(text);
  if (bigrams.length === 0) return new Float32Array(0);
  const out = new Float32Array(VEC_DIM);
  for (const b of bigrams) {
    const idx = hashStr(b) % VEC_DIM;
    out[idx] += 1;
  }
  normalize(out);
  return out;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h);
}

function charBigrams(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^a-záéíóúñü0-9\s]/g, "")
    .trim();
  if (normalized.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < normalized.length - 1; i++) {
    const bg = normalized.substring(i, i + 2);
    if (bg.trim().length === 2) out.push(bg);
  }
  return out;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  let dot = 0, nA = 0, nB = 0;
  for (let i = 0; i < maxLen; i++) {
    const av = i < a.length ? a[i] : 0;
    const bv = i < b.length ? b[i] : 0;
    dot += av * bv;
    nA += av * av;
    nB += bv * bv;
  }
  return dot / (Math.sqrt(nA) * Math.sqrt(nB) + 1e-10);
}

export function computeSimilarity(t1: string, t2: string): number {
  return cosineSimilarity(embed(t1), embed(t2));
}

export function findMostSimilar(
  query: string,
  candidates: string[],
  topK: number,
): ScoredResult<string>[] {
  if (candidates.length === 0) return [];
  const q = embed(query);
  const scored = candidates.map((c) => ({
    item: c,
    score: cosineSimilarity(q, embed(c)),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function normalize(v: Float32Array): void {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) + 1e-10;
  if (n > 0) { for (let i = 0; i < v.length; i++) v[i] /= n; }
}

export function clearEmbeddingCache(): void {
  cache.clear();
}
