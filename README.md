# tawk.to for your Claude chatbot

Eight short HTML lessons, five reference sheets, and a tested TypeScript companion package for integrating **tawk.to** live chat with a **Claude-powered chatbot** on **Vercel**, with answers that come first from a curated FAQ and otherwise only from one or two approved sources, on the web and on Android.

Open `index.html` in a browser to start. No build step: the lessons are plain HTML plus a shared stylesheet and a few small components.

## The premise

tawk.to does not let an outside system post messages into its chat widget. Its public surface is the widget JavaScript API, outbound webhooks for four events, a by-request REST API without messaging, and (on paid plans) AI Assist calling *your* API as a tool. tawk.to staff confirmed the gap on the community forum in 2024, 2025 and October 2026. Lesson 1 has the citations.

So the course teaches the pattern that survives that fact: **your bot is the front door; tawk.to is the human channel.**

## Lessons

| # | Lesson | Win |
|---|--------|-----|
| 1 | [The map: what tawk.to can and cannot do](lessons/0001-the-map-what-tawkto-can-and-cannot-do.html) | An architecture decision you can defend with citations |
| 2 | [Hand off with context: driving the widget](lessons/0002-hand-off-with-context-driving-the-widget.html) | `escalateToHuman()` that identifies the visitor and opens chat with a summary |
| 3 | [Webhooks into Vercel: verify, dedupe, store](lessons/0003-webhooks-into-vercel.html) | A signed-webhook endpoint that rejects forgeries |
| 4 | [FAQ-first: the deterministic tier](lessons/0004-faq-first-the-deterministic-tier.html) | A FAQ matcher with a threshold you tuned |
| 5 | [Answer only from approved sources](lessons/0005-answer-only-from-approved-sources.html) | Grounded answers with citations, or an honest "I don't know" |
| 6 | [The answer pipeline end to end](lessons/0006-the-answer-pipeline-end-to-end.html) | FAQ, sources, fallback, human: one function |
| 7 | [Graph RAG: when a graph beats chunks](lessons/0007-graph-rag-when-a-graph-beats-chunks.html) | A decision on whether your corpus needs a graph, plus a prototype |
| 8 | [Android: the same bot on a phone](lessons/0008-android-the-same-bot-on-a-phone.html) | Your bot and tawk.to chat inside an Android shell |

Plus a [spaced review](lessons/review.html) page that interleaves every recall card, due-first.

## Reference sheets

`reference/`: tawk.to JavaScript API, tawk.to webhooks, the answer pipeline, retrieval and Graph RAG, and the glossary.

## Companion code (`examples/`)

```bash
cd examples
npm install
npm run check          # typecheck + tests
npx tsx scripts/ask-grounded.ts "Which support channel do annual members get?"   # needs ANTHROPIC_API_KEY
npx tsx scripts/send-test-webhook.ts https://your-app.vercel.app/api/tawk-webhook "$TAWK_WEBHOOK_SECRET" chat:start
```

| Module | What it is |
|--------|------------|
| `src/faq-match.ts` | FAQ tier: normalisation, three scoring strategies, threshold + margin decision |
| `src/allowed-sources.ts` | Allow-list guard mirroring Claude's domain-filter rules |
| `src/grounded-answer.ts` | Claude call with citable `document` blocks and the `NOT_IN_SOURCES` sentinel |
| `src/pipeline.ts` | `answer()`: human requested → FAQ → approved sources → fallback |
| `src/tawk-secure-mode.ts` | HMAC-SHA256 visitor hash for tawk.to secure mode / `login()` |
| `src/tawk-webhook.ts`, `api/tawk-webhook.ts` | HMAC-SHA1 verification, dedupe on `X-Hook-Event-Id`, typed events, Vercel handler |
| `src/graph-lite.ts` | A tiny triple-store with k-hop neighbourhood retrieval |

## Workspace files

This folder is a teaching workspace. `MISSION.md` says why the course exists, `RESOURCES.md` lists the trusted sources and communities, `GLOSSARY.md` and `NOTES.md` keep the vocabulary and teaching preferences, and `learning-records/` records what has been established. Future lessons are built from these.

## Verification

Every factual claim in the lessons links to the page it was checked against on 2026-10-17 (tawk.to developer and help pages, Claude platform docs, Vercel docs, arXiv papers, official repositories). Documentation moves; if a link is stale, ask the agent to re-verify it.

## License

MIT for the code in `examples/`. Lesson text © 2026, shared for personal learning.
