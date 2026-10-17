import { describe, expect, it } from "vitest";
import { GraphIndex, parseTriples } from "../src/graph-lite.js";
import { TRIPLES } from "./fixtures.js";

const graph = new GraphIndex(parseTriples(TRIPLES));

describe("parseTriples", () => {
  it("parses pipe-separated lines with provenance and skips comments", () => {
    const t = parseTriples("# comment\nA | likes | B | src\n\nC|knows|D");
    expect(t).toEqual([
      { s: "A", p: "likes", o: "B", source: "src" },
      { s: "C", p: "knows", o: "D" },
    ]);
  });
});

describe("GraphIndex.findEntities", () => {
  it("finds entity names in a question, longest first, case-insensitively", () => {
    const found = graph.findEntities("I'm on the plan with the e-bike discount; which support channel do I get?");
    expect(found).toEqual(["E-bike discount"]);
    expect(graph.findEntities("does the lost card fee apply with the 14-day refund?")).toEqual(expect.arrayContaining(["Lost card fee", "14-day refund"]));
  });
});

describe("GraphIndex.neighborhood", () => {
  it("one hop from the discount does not reach the support channel", () => {
    const n1 = graph.neighborhood(["E-bike discount"], 1);
    expect(n1.nodes.has("Annual Membership")).toBe(true);
    expect(n1.nodes.has("Priority phone line")).toBe(false);
  });
  it("two hops bridge discount → plan → support channel (the multi-hop case)", () => {
    const n2 = graph.neighborhood(["E-bike discount"], 2);
    expect(n2.nodes.get("Priority phone line")).toBe(2);
    expect(GraphIndex.toContext(n2.triples)).toContain("Annual Membership — includes — Priority phone line [support-page]");
  });
  it("ignores seeds that are not in the graph", () => {
    const n = graph.neighborhood(["Nonexistent"], 3);
    expect(n.nodes.size).toBe(0);
    expect(n.triples).toEqual([]);
  });
  it("returns triples in stable index order without duplicates", () => {
    const n = graph.neighborhood(["Annual Membership"], 1);
    const ids = n.triples.map((t) => `${t.s}|${t.p}|${t.o}`);
    expect(new Set(ids).size).toBe(ids.length);
    expect(n.triples.length).toBe(5);
  });
});
