import { describe, expect, it } from "vitest";
import { matchFaq, normalize, rankFaq, tokens } from "../src/faq-match.js";
import { FAQ } from "./fixtures.js";

describe("normalisation", () => {
  it("lowercases, strips punctuation and apostrophes, collapses spaces", () => {
    expect(normalize("  Can't   LOG-in?! ")).toBe("cant log in");
  });
  it("drops stop words and stems lightly", () => {
    expect(tokens("How do I reset my passwords?")).toEqual(["reset", "password"]);
  });
});

describe("rankFaq", () => {
  it("puts the right entry first for a paraphrase", () => {
    const ranked = rankFaq(FAQ, "forgot pw, cannot log into my account");
    expect(ranked[0]?.id).toBe("reset-password");
  });
  it("exact strategy only matches a normalised variant", () => {
    expect(rankFaq(FAQ, "can i get a REFUND", "exact")[0]).toMatchObject({ id: "refund", score: 1 });
    expect(rankFaq(FAQ, "refund please", "exact")[0]?.score).toBe(0);
  });
  it("scores are within 0..1 for every strategy", () => {
    for (const s of ["exact", "jaccard", "tfidf"] as const) {
      for (const r of rankFaq(FAQ, "where are the e-bikes", s)) {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1.0000001);
      }
    }
  });
});

describe("matchFaq decisions", () => {
  it("hits on a close paraphrase and returns the canonical answer", () => {
    const d = matchFaq(FAQ, "I lost my card, how do I get a replacement?", { threshold: 0.4 });
    expect(d.hit).toBe(true);
    if (d.hit) {
      expect(d.entry.id).toBe("lost-card");
      expect(d.entry.answer).toContain("$10");
    }
  });
  it("falls through on an out-of-scope question", () => {
    const d = matchFaq(FAQ, "what will the weather be like tomorrow in Boston?", { threshold: 0.4 });
    expect(d.hit).toBe(false);
  });
  it("respects the threshold", () => {
    const loose = matchFaq(FAQ, "when are stations open", { threshold: 0.1, margin: 0 });
    const strict = matchFaq(FAQ, "when are stations open", { threshold: 0.95, margin: 0 });
    expect(loose.hit).toBe(true);
    expect(strict.hit).toBe(false);
    if (!strict.hit) expect(strict.reason).toBe("below-threshold");
  });
  it("declines when the top two are too close (ambiguous)", () => {
    const faq = [
      { id: "a", questions: ["change my email address"], answer: "A" },
      { id: "b", questions: ["change my email password"], answer: "B" },
    ];
    const d = matchFaq(faq, "change my email", { strategy: "jaccard", threshold: 0.3, margin: 0.2 });
    expect(d.hit).toBe(false);
    if (!d.hit) expect(d.reason).toBe("ambiguous");
  });
  it("reports empty when nothing overlaps at all", () => {
    const d = matchFaq(FAQ, "zzzz qqqq", { threshold: 0.1 });
    expect(d.hit).toBe(false);
    if (!d.hit) expect(d.reason).toBe("empty");
  });
});
