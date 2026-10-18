/**
 * Live smoke test for the one path the unit tests cannot reach: the real
 * Claude request inside groundedAnswer() — document blocks with citations
 * enabled, the refusal-fallback beta, and the NOT_IN_SOURCES sentinel as the
 * model actually emits it. Everything else in grounded-answer.ts is covered
 * offline by grounded-answer.test.ts and pipeline.test.ts.
 *
 * Gate: runs only when ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is set;
 * otherwise both cases are reported as skipped, so CI stays green until the
 * repository has the secret. Not part of `npm test` (vitest.config.ts excludes
 * *.live.test.ts); run it with `npm run test:live`.
 *
 * Cost: two short requests over three tiny documents, well under a cent.
 * Assertions check structure (grounded flag, citation URLs, verbatim quotes),
 * not the model's wording, so the test is stable across runs.
 */
import { describe, expect, it } from "vitest";
import { NOT_IN_SOURCES, groundedAnswer } from "../src/grounded-answer.js";
import { CHUNKS } from "./fixtures.js";

const hasCredentials = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const chunkUrls = new Set(CHUNKS.map((c) => c.url));
const supportChunk = CHUNKS.find((c) => c.id === "support-1");

describe.skipIf(!hasCredentials)("groundedAnswer() against the live Claude API", () => {
  it("answers a question the sources cover and cites the chunk that holds the fact", async () => {
    const result = await groundedAnswer("Which support channel do annual members get?", CHUNKS);

    expect(result.grounded).toBe(true);
    expect(result.text).not.toBe("");
    expect(result.text).not.toContain(NOT_IN_SOURCES);

    expect(result.citations.length).toBeGreaterThan(0);
    for (const citation of result.citations) {
      expect(chunkUrls.has(citation.url ?? "")).toBe(true); // document_index mapped back to a known chunk
      expect(citation.quote ?? "").not.toBe(""); // cited_text is verbatim source text
    }
    expect(supportChunk).toBeDefined();
    expect(result.citations.some((c) => c.url === supportChunk?.url)).toBe(true);
    expect(result.citations.map((c) => c.quote ?? "").join(" ")).toMatch(/phone/i);
  });

  it("returns the sentinel rather than a guess when the sources do not answer", async () => {
    const result = await groundedAnswer("What is the boiling point of water in kelvin?", CHUNKS);

    expect(result.grounded).toBe(false);
    expect(result.citations).toEqual([]);
  });
});
