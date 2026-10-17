/**
 * Grounded answering with Claude citations (lesson 5).
 *
 * Each retrieved chunk becomes a `document` content block with
 * `citations: { enabled: true }`, so the API returns verifiable pointers
 * (`cited_text`, document index, character offsets) instead of free-floating
 * claims. Docs: https://platform.claude.com/docs/en/build-with-claude/citations
 * (checked 2026-10-17). `cited_text` does not count toward output tokens, and
 * citations are incompatible with structured outputs (400).
 *
 * The system prompt gives the model explicit permission to say the sources do
 * not answer the question; the sentinel line lets the pipeline detect that
 * without parsing prose.
 *
 * Server-side refusal fallback is enabled (`fallbacks: "default"`): if a
 * safety classifier declines the request, the API re-runs it on a fallback
 * model inside the same call. Remove `betas`/`fallbacks` if you prefer not to.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Chunk, Citation, Generated } from "./pipeline.js";

export const NOT_IN_SOURCES = "NOT_IN_SOURCES";

export const GROUNDING_SYSTEM_PROMPT = `You are the help assistant for one organisation. You answer ONLY from the documents provided in the user turn.

Rules:
1. Use only facts that appear in the documents. Do not use outside knowledge, even if you are confident.
2. Cite the documents for every factual sentence.
3. If the documents do not contain the answer, reply with exactly: ${NOT_IN_SOURCES}
   and nothing else. Saying so is the correct answer, not a failure.
4. Be brief and concrete: two to five sentences, plain language, no preamble.
5. Never invent URLs, prices, dates or policy details.`;

/** One document block per chunk. `context` is read by the model but is never cited from. */
export function buildDocuments(chunks: Chunk[]): Anthropic.ContentBlockParam[] {
  return chunks.map<Anthropic.DocumentBlockParam>((c) => ({
    type: "document",
    source: { type: "text", media_type: "text/plain", data: c.text },
    title: c.title,
    context: `Source URL: ${c.url}`,
    citations: { enabled: true },
  }));
}

/** Turns the response content into text + citations, mapping document_index back to chunk URLs. */
export function parseGroundedResponse(content: Anthropic.ContentBlock[], chunks: Chunk[]): Generated {
  let text = "";
  const citations: Citation[] = [];
  const seen = new Set<string>();
  for (const block of content) {
    if (block.type !== "text") continue;
    text += block.text;
    for (const c of block.citations ?? []) {
      if (c.type !== "char_location") continue;
      const chunk = chunks[c.document_index];
      const key = `${c.document_index}:${c.start_char_index}`;
      if (!chunk || seen.has(key)) continue;
      seen.add(key);
      citations.push({ title: chunk.title, url: chunk.url, quote: c.cited_text });
    }
  }
  const trimmed = text.trim();
  const grounded = trimmed.length > 0 && !trimmed.includes(NOT_IN_SOURCES);
  return { text: trimmed, citations: grounded ? citations : [], grounded };
}

export interface GroundedAnswerOptions {
  client?: Anthropic;
  model?: string;
  maxTokens?: number;
}

/** Calls Claude with the chunks as citable documents and returns a Generated for the pipeline. */
export async function groundedAnswer(question: string, chunks: Chunk[], opts: GroundedAnswerOptions = {}): Promise<Generated> {
  const client = opts.client ?? new Anthropic();
  const response = await client.beta.messages.create({
    model: opts.model ?? "claude-opus-5-5",
    max_tokens: opts.maxTokens ?? 1024,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" }, // support chat rarely needs more; raise if evals say so
    system: [{ type: "text", text: GROUNDING_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [...(buildDocuments(chunks) as Anthropic.Beta.BetaContentBlockParam[]), { type: "text", text: `Question: ${question}` }],
      },
    ],
  });
  if (response.stop_reason === "refusal") {
    return { text: "", citations: [], grounded: false };
  }
  return parseGroundedResponse(response.content as unknown as Anthropic.ContentBlock[], chunks);
}
