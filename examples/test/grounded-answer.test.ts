import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { buildDocuments, parseGroundedResponse } from "../src/grounded-answer.js";
import { CHUNKS } from "./fixtures.js";

describe("buildDocuments", () => {
  it("makes one citable plain-text document per chunk, with the URL in context", () => {
    const docs = buildDocuments(CHUNKS);
    expect(docs).toHaveLength(CHUNKS.length);
    const first = docs[0] as Anthropic.DocumentBlockParam;
    expect(first.type).toBe("document");
    expect(first.citations).toEqual({ enabled: true });
    expect(first.title).toBe("Plans");
    expect(first.context).toBe("Source URL: https://help.harbor.example/plans");
    expect(first.source).toMatchObject({ type: "text", media_type: "text/plain" });
  });
});

describe("parseGroundedResponse", () => {
  it("joins text blocks and maps char_location citations back to chunk URLs", () => {
    const content = [
      { type: "text", text: "Annual members use ", citations: null },
      {
        type: "text",
        text: "the priority phone line.",
        citations: [
          { type: "char_location", document_index: 1, document_title: "Support channels", start_char_index: 0, end_char_index: 45, cited_text: "Annual members use the priority phone line (7am–9pm)." },
          { type: "char_location", document_index: 1, document_title: "Support channels", start_char_index: 0, end_char_index: 45, cited_text: "duplicate" },
        ],
      },
    ] as unknown as Anthropic.ContentBlock[];
    const g = parseGroundedResponse(content, CHUNKS);
    expect(g.grounded).toBe(true);
    expect(g.text).toBe("Annual members use the priority phone line.");
    expect(g.citations).toEqual([{ title: "Support channels", url: "https://help.harbor.example/support", quote: "Annual members use the priority phone line (7am–9pm)." }]);
  });
  it("treats the sentinel as not grounded and drops any citations", () => {
    const content = [{ type: "text", text: "NOT_IN_SOURCES", citations: [{ type: "char_location", document_index: 0, document_title: "Plans", start_char_index: 0, end_char_index: 5, cited_text: "x" }] }] as unknown as Anthropic.ContentBlock[];
    const g = parseGroundedResponse(content, CHUNKS);
    expect(g.grounded).toBe(false);
    expect(g.citations).toEqual([]);
  });
  it("ignores citations that point outside the chunk list", () => {
    const content = [{ type: "text", text: "Hi.", citations: [{ type: "char_location", document_index: 9, document_title: "?", start_char_index: 0, end_char_index: 1, cited_text: "x" }] }] as unknown as Anthropic.ContentBlock[];
    expect(parseGroundedResponse(content, CHUNKS).citations).toEqual([]);
  });
});
