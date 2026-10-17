/**
 * The answer pipeline (lesson 6): FAQ → approved sources → honest fallback → human.
 *
 * Each tier is injected, so the orchestration is testable without a network:
 *   retrieve(question)            → chunks from your approved-source index
 *   generate(question, chunks)    → a grounded answer with citations (see grounded-answer.ts)
 *
 * The pipeline never lets a chunk from outside the allow-list reach the model,
 * and never returns a model answer that carries no citation.
 */
import { matchFaq, type FaqEntry, type FaqMatchOptions } from "./faq-match.js";
import { filterToAllowed, normalizeAllowList, type AllowEntry } from "./allowed-sources.js";

export type Tier = "faq" | "sources" | "fallback";

export interface Citation {
  title: string;
  url?: string;
  quote?: string;
}

export interface Chunk {
  id: string;
  title: string;
  url: string;
  text: string;
}

export interface Generated {
  text: string;
  citations: Citation[];
  /** False when the model signalled that the sources do not answer the question. */
  grounded: boolean;
}

export interface Answer {
  tier: Tier;
  text: string;
  citations: Citation[];
  /** 0..1; FAQ score, 1 for grounded answers with citations, 0 for fallbacks. */
  confidence: number;
  /** True when the UI should offer (or trigger) a handoff to a human in tawk.to. */
  handoff: boolean;
  reason: string;
}

export interface PipelineDeps {
  faq: FaqEntry[];
  faqOptions?: FaqMatchOptions;
  allowedSources: string[];
  retrieve: (question: string) => Promise<Chunk[]>;
  generate: (question: string, chunks: Chunk[]) => Promise<Generated>;
  /** Minimum citations for a model answer to count as grounded. Default 1. */
  minCitations?: number;
  /** Phrases that mean "I want a person". Default list covers the common ones. */
  handoffPhrases?: string[];
  /** Shown when nothing in the approved sources answers the question. */
  fallbackText?: string;
}

const DEFAULT_HANDOFF = ["talk to a human", "talk to a person", "speak to someone", "real person", "live agent", "human agent", "customer service rep"];

export function wantsHuman(question: string, phrases: string[] = DEFAULT_HANDOFF): boolean {
  const q = question.toLowerCase();
  return phrases.some((p) => q.includes(p));
}

export async function answer(question: string, deps: PipelineDeps): Promise<Answer> {
  const allow: AllowEntry[] = normalizeAllowList(deps.allowedSources);
  const minCitations = deps.minCitations ?? 1;
  const fallbackText =
    deps.fallbackText ??
    "I can only answer from our official help pages, and I could not find this there. I can connect you with a person who can help.";

  // Tier 0: the visitor asked for a person. Do not make them argue with a bot.
  if (wantsHuman(question, deps.handoffPhrases)) {
    return { tier: "fallback", text: "Of course. Connecting you with a person now.", citations: [], confidence: 1, handoff: true, reason: "visitor-requested-human" };
  }

  // Tier 1: curated FAQ, returned verbatim. Deterministic, cheap, auditable.
  const faq = matchFaq(deps.faq, question, deps.faqOptions);
  if (faq.hit) {
    const citations: Citation[] = faq.entry.source ? [{ title: "FAQ", url: faq.entry.source }] : [{ title: "FAQ" }];
    return { tier: "faq", text: faq.entry.answer, citations, confidence: faq.score, handoff: false, reason: `faq:${faq.entry.id}` };
  }

  // Tier 2: approved sources only. Defence in depth: filter again, even though the index was built from the allow-list.
  const retrieved = filterToAllowed(await deps.retrieve(question), allow);
  if (retrieved.length === 0) {
    return { tier: "fallback", text: fallbackText, citations: [], confidence: 0, handoff: true, reason: "no-approved-chunks" };
  }
  const gen = await deps.generate(question, retrieved);
  const citations = filterToAllowed(gen.citations, allow);
  if (!gen.grounded || citations.length < minCitations) {
    return { tier: "fallback", text: fallbackText, citations: [], confidence: 0, handoff: true, reason: gen.grounded ? "insufficient-citations" : "model-declined" };
  }
  return { tier: "sources", text: gen.text, citations, confidence: 1, handoff: false, reason: "grounded" };
}
