# tawk.to × Claude chatbot Glossary

Canonical vocabulary for this workspace. The lesson-facing version with full definitions is `reference/glossary.html`; this file tracks which terms the learner has demonstrated, so future sessions know what needs no re-teaching.

## Established (demonstrated by the learner before the course)

**Claude API**:
Anthropic's Messages API, called from server code; Andy has it working in Vercel dev and production.
_Avoid_: "the Anthropic endpoint", "the LLM backend"

**Vercel Function**:
A serverless HTTP handler deployed on Vercel; the home of every server-side piece in this course.
_Avoid_: "lambda", "edge function" (the Edge runtime is deprecated)

**Prompting**:
Writing system and user instructions for a model; assumed fluent, not taught here.

## Introduced (promote to Established once used correctly in conversation or a lab)

- Widget, Property, JavaScript API, Secure mode, Webhook, Direct Chat Link, AI Assist, Instructions, Shortcut, Trigger, Escalation
- Pattern A / B / C, Handoff, Tier, FAQ tier, Threshold, Margin, Approved sources, Grounded, Sentinel, Reason code
- Chunk, Citation, Domain filter, Prior-context rule, Prompt caching, tf-idf cosine, BM25, Embeddings, Contextual retrieval
- Graph RAG, Triple, Community report, Multi-hop question
- Raw body, Idempotency key, Shell (Android), WebView chat screen

## Resolutions of loose usage

- In this workspace, "handoff" always means moving a visitor from *our* bot to a human in tawk.to. "Escalation" is reserved for AI Assist's paid setting of the same name.
- "Approved sources" never means a blocklist; it is always an allow-list of hosts (optionally with a path prefix).
- "Grounded" is a code-checked property (text plus at least one allowed citation), not a judgement about tone.
