/**
 * graph-lite: the smallest useful Graph RAG index (lesson 7).
 *
 * A knowledge graph here is just a list of triples (subject, predicate, object)
 * with provenance. Retrieval is "start at the entities named in the question
 * and walk k hops"; the walked triples become the context you hand the model.
 * This is the "local search" idea from Microsoft's GraphRAG, stripped to its
 * core so you can see what a graph buys you before adopting a graph database.
 */

export interface Triple {
  s: string;
  p: string;
  o: string;
  source?: string;
}

export interface Neighborhood {
  /** Entity → hop distance from the nearest seed (0 for seeds). */
  nodes: Map<string, number>;
  triples: Triple[];
}

/** Parses "subject | predicate | object | source" lines; blank lines and # comments are skipped. */
export function parseTriples(text: string): Triple[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p): p is string[] => p.length >= 3 && p[0] !== "" && p[2] !== "")
    .map((p) => {
      const t: Triple = { s: p[0] ?? "", p: p[1] ?? "related to", o: p[2] ?? "" };
      if (p[3]) t.source = p[3];
      return t;
    });
}

export class GraphIndex {
  private readonly adjacency = new Map<string, { to: string; triple: number }[]>();
  private readonly byLower = new Map<string, string>();
  readonly triples: Triple[];

  constructor(triples: Triple[]) {
    this.triples = triples.slice();
    triples.forEach((t, i) => {
      for (const n of [t.s, t.o]) {
        if (!this.adjacency.has(n)) this.adjacency.set(n, []);
        this.byLower.set(n.toLowerCase(), n);
      }
      this.adjacency.get(t.s)?.push({ to: t.o, triple: i });
      this.adjacency.get(t.o)?.push({ to: t.s, triple: i });
    });
  }

  get entities(): string[] {
    return [...this.adjacency.keys()];
  }

  has(entity: string): boolean {
    return this.adjacency.has(entity);
  }

  /** Finds graph entities mentioned in free text (case-insensitive, longest names first). */
  findEntities(text: string): string[] {
    const hay = text.toLowerCase();
    const found: string[] = [];
    const names = [...this.byLower.keys()].sort((a, b) => b.length - a.length);
    let remaining = hay;
    for (const lower of names) {
      const idx = remaining.indexOf(lower);
      if (idx >= 0) {
        found.push(this.byLower.get(lower) ?? lower);
        remaining = remaining.slice(0, idx) + " ".repeat(lower.length) + remaining.slice(idx + lower.length);
      }
    }
    return found;
  }

  /** Breadth-first walk from the seeds, up to `hops` edges away. */
  neighborhood(seeds: string[], hops: number): Neighborhood {
    const nodes = new Map<string, number>();
    const edgeIds = new Set<number>();
    let frontier = seeds.filter((s) => this.adjacency.has(s));
    for (const s of frontier) nodes.set(s, 0);
    for (let hop = 1; hop <= hops; hop++) {
      const next: string[] = [];
      for (const n of frontier) {
        for (const a of this.adjacency.get(n) ?? []) {
          edgeIds.add(a.triple);
          if (!nodes.has(a.to)) {
            nodes.set(a.to, hop);
            next.push(a.to);
          }
        }
      }
      frontier = next;
    }
    const triples = [...edgeIds].sort((a, b) => a - b).map((i) => this.triples[i]).filter((t): t is Triple => t !== undefined);
    return { nodes, triples };
  }

  /** Renders triples as compact, citable lines for a prompt. */
  static toContext(triples: Triple[]): string {
    return triples.map((t) => `- ${t.s} — ${t.p} — ${t.o}${t.source ? ` [${t.source}]` : ""}`).join("\n");
  }
}
