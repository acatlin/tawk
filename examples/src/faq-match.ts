/**
 * FAQ-first matching: the deterministic tier that runs BEFORE any model call.
 *
 * Design (lesson 4):
 *  - Every FAQ entry has several question variants and one canonical answer.
 *  - Scores are normalised to 0..1 so one threshold works across strategies.
 *  - A hit requires the top score to clear `threshold` AND to beat the runner-up
 *    by `margin`; otherwise we fall through to the next tier. A wrong confident
 *    FAQ answer costs more trust than a fall-through.
 *
 * The browser lab (assets/faq-lab.js) uses the same normalisation and scoring,
 * so thresholds you tune there transfer here.
 */

export interface FaqEntry {
  id: string;
  /** Question variants: the canonical phrasing first, then paraphrases users actually type. */
  questions: string[];
  /** The canonical answer, returned verbatim on a hit. */
  answer: string;
  /** Where the answer comes from, so the bot can cite it. */
  source?: string;
}

export type Strategy = "exact" | "jaccard" | "tfidf";

export interface FaqMatchOptions {
  strategy?: Strategy;
  /** Minimum top score (0..1) to accept. Default 0.5. */
  threshold?: number;
  /** Minimum gap between the top two scores. Default 0.1. Set 0 to disable. */
  margin?: number;
}

export interface RankedEntry {
  id: string;
  score: number;
  entry: FaqEntry;
}

export type FaqDecision =
  | { hit: true; entry: FaqEntry; score: number; ranked: RankedEntry[] }
  | { hit: false; reason: "empty" | "below-threshold" | "ambiguous"; ranked: RankedEntry[] };

const STOP = new Set([
  "a", "an", "the", "is", "are", "am", "i", "to", "of", "in", "on", "for", "do", "does", "can", "how",
  "what", "my", "me", "it", "you", "your", "we", "our", "and", "or", "with", "be", "this", "that",
  "there", "please", "hi", "hello",
]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A deliberately tiny stemmer: enough for FAQ paraphrases, not a linguistics project. */
function stem(w: string): string {
  if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3).replace(/([b-df-hj-np-tv-z])$/, "$1"); // resetting → reset
  if (w.length > 5 && /ed$/.test(w)) return w.slice(0, -2);
  if (w.length > 4 && /(ches|shes|sses|xes|zes)$/.test(w)) return w.slice(0, -2); // boxes → box
  if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1); // bikes → bike
  return w;
}

export function tokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((w) => w.length > 0 && !STOP.has(w))
    .map(stem);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

/** Builds a tf-idf cosine scorer over tokenised documents. */
function tfidfScorer(docs: string[][]): (query: string[], docIndex: number) => number {
  const N = docs.length;
  const df = new Map<string, number>();
  const tfs = docs.map((d) => {
    const tf = new Map<string, number>();
    for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return tf;
  });
  const idf = (t: string): number => Math.log(1 + N / (1 + (df.get(t) ?? 0)));
  const vec = (tf: Map<string, number>): Map<string, number> => {
    const v = new Map<string, number>();
    let norm = 0;
    for (const [t, c] of tf) {
      const w = (1 + Math.log(c)) * idf(t);
      v.set(t, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of v) v.set(t, w / norm);
    return v;
  };
  const docVecs = tfs.map(vec);
  return (query, i) => {
    const tf = new Map<string, number>();
    for (const t of query) tf.set(t, (tf.get(t) ?? 0) + 1);
    const qv = vec(tf);
    const dv = docVecs[i];
    if (!dv) return 0;
    let s = 0;
    for (const [t, w] of qv) {
      const d = dv.get(t);
      if (d !== undefined) s += w * d;
    }
    return s;
  };
}

export function rankFaq(faq: FaqEntry[], question: string, strategy: Strategy = "tfidf"): RankedEntry[] {
  const qn = normalize(question);
  const qt = tokens(question);
  const docs = faq.map((f) => tokens([...f.questions, f.answer].join(" ")));
  const scorer = strategy === "tfidf" ? tfidfScorer(docs) : null;
  return faq
    .map((entry, i) => {
      let score = 0;
      if (strategy === "exact") {
        score = entry.questions.some((v) => normalize(v) === qn) ? 1 : 0;
      } else if (strategy === "jaccard") {
        score = entry.questions.reduce((best, v) => Math.max(best, jaccard(qt, tokens(v))), 0);
      } else if (scorer) {
        score = scorer(qt, i);
      }
      return { id: entry.id, score, entry };
    })
    .sort((a, b) => b.score - a.score);
}

export function matchFaq(faq: FaqEntry[], question: string, opts: FaqMatchOptions = {}): FaqDecision {
  const { strategy = "tfidf", threshold = 0.5, margin = 0.1 } = opts;
  const ranked = rankFaq(faq, question, strategy);
  const top = ranked[0];
  const second = ranked[1];
  if (!top || top.score <= 0) return { hit: false, reason: "empty", ranked };
  if (top.score < threshold) return { hit: false, reason: "below-threshold", ranked };
  if (second && margin > 0 && top.score - second.score < margin) return { hit: false, reason: "ambiguous", ranked };
  return { hit: true, entry: top.entry, score: top.score, ranked };
}
