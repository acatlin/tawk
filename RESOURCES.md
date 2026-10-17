# tawk.to × Claude chatbot: Resources

All entries were fetched and checked on 2026-10-17. Full research notes with verbatim quotes live in the session scratchpad reports; the lessons cite these pages inline.

## Knowledge

### tawk.to (official)

- [tawk.to JavaScript API reference](https://developer.tawk.to/jsapi/)
  The single page for `window.Tawk_API`: settings, methods, callbacks, error codes, secure mode. Use for: anything the widget can do in the browser; lesson 2, lesson 8.
- [tawk.to Webhooks reference](https://developer.tawk.to/webhooks/)
  Four events, verbatim payloads, HMAC-SHA1 `X-Tawk-Signature`, retry policy, `X-Hook-Event-Id`. Use for: lesson 3 and any server-side integration.
- [tawk.to developer product updates](https://developer.tawk.to/product-updates/)
  Widget release notes (4.x rebuild in Sept 2026; `setChatInputMessage` 4.2.0; `onTranscriptRequest` 4.1.0; message payload shape since 0.2.0). Use for: checking whether an API member exists in the current widget.
- [tawk.to Help: REST API](https://help.tawk.to/article/rest-api)
  By-request beta; HTTP Basic; RPC-style at `https://api.tawk.to/v1/`; capability list (no messaging). Use for: deciding whether the REST API is worth applying for.
- [tawk.to Help: introduction to integrations](https://help.tawk.to/article/an-introduction-to-integrations-in-tawkto)
  tawk.to's own statement of its two integration paths. Use for: lesson 1 framing.
- [tawk.to Help: custom API integration with AI Assist](https://help.tawk.to/article/how-to-set-up-a-custom-api-integration-with-apollo-ai)
  OpenAPI 3.0 or MCP tools for AI Assist, Growth plan and up; "API responses take priority over other data sources". Use for: Pattern B and the hybrid.
- [tawk.to Help: understanding AI Assist's data sources](https://help.tawk.to/article/understanding-ai-assist%E2%80%99s-data-sources)
  Source types, "up to 5 chunks" retrieval, per-source limits. Use for: comparing native AI with the custom pipeline (lesson 6).
- [tawk.to Help: using Instructions to restrict AI Assist replies](https://help.tawk.to/article/using-base-prompt-to-restrict-ai-assist-replies)
  Prompt-based scope restriction samples; no strict switch exists. Use for: lesson 6 comparison.
- [tawk.to Help: controlling ingestion with an XML sitemap](https://help.tawk.to/article/how-to-control-ai-assist%E2%80%99s-data-ingestion-using-an-xml-sitemap)
  How to limit AI Assist's crawl to specific pages. Use for: Pattern B source restriction.
- [tawk.to Help: AI Assist billing](https://help.tawk.to/article/how-to-manage-billing-for-ai-assist)
  Plans, credits ("Auto costs 3 credits per reply"), top-ups. Use for: cost comparison.
- [tawk.to Help: transferring to human agents](https://help.tawk.to/article/how-to-train-apollo-ai-to-transfer-chats-to-human-agents)
  Escalation shortcuts; AI leaves when a human joins; offline behaviour. Use for: handoff design in Pattern B.
- [tawk.to Help: generating a hash for the JavaScript API](https://help.tawk.to/article/how-to-generate-a-hash-for-javascript-api)
  Where the secure-mode key lives (Administration → Overview → JavaScript API). Use for: lesson 2.
- [tawk.to Help: creating and managing webhooks](https://help.tawk.to/article/creating-and-managing-webhooks)
  Dashboard steps; 10 webhooks per property; transcript timing. Use for: lesson 3 setup.
- [tawk.to Help: adding the widget to your mobile application](https://help.tawk.to/article/how-to-add-the-tawkto-widget-to-your-mobile-application)
  "A Mobile SDK is in our development roadmap"; WebView and Direct Chat Link guidance. Use for: lesson 8.
- [tawk.to official Android sample (Bitbucket)](https://bitbucket.org/tawkto/widget-embed-android) and [iOS sample](https://bitbucket.org/tawkto/widget-embed-ios)
  Kotlin WebView wrapper (minSdk 24) and WKWebView sample. Use for: the chat screen in lesson 8.
- [tawk-messenger-react (GitHub)](https://github.com/tawk/tawk-messenger-react)
  Official React wrapper; API reference in `docs/api-reference.md`. Use for: React projects.
- [tawk.to Help: Direct Chat Link](https://help.tawk.to/article/direct-chat-link)
  Format, uses, considerations. Use for: zero-code fallback on mobile.

### Claude platform (official)

- [Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
  Document blocks, citation shapes, token accounting, incompatibility with structured outputs. Use for: lesson 5.
- [Web fetch tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool) and [Server tools: domain filtering](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools#domain-filtering)
  `allowed_domains` rules, prior-context rule, error codes, pricing. Use for: Pattern B retrieval in lesson 5.
- [Web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
  Versions, parameters, $10 per 1,000 searches. Use for: when a visitor names a page without a URL.
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
  Minimum cacheable prefix per model, TTLs, pricing multipliers. Use for: caching the grounding prompt and corpus.
- [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
  Permission to say "I don't know", quote-first grounding, external knowledge restriction. Use for: the grounding prompt.
- [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings)
  Anthropic recommends Voyage AI; model list. Use for: stepping beyond lexical matching.
- [Introducing Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
  Measured retrieval-failure reductions; the "under 200k tokens, skip RAG" rule. Use for: lesson 7's decision.
- [Claude cookbook: RAG guide](https://platform.claude.com/cookbook/capabilities-retrieval-augmented-generation-guide) and [knowledge graph construction](https://platform.claude.com/cookbook/capabilities-knowledge-graph-guide)
  Worked notebooks. Use for: next steps after the course prototypes.

### Vercel (official)

- [Vercel Functions API reference](https://vercel.com/docs/functions/functions-api-reference)
  Web-standard handler signature; `@vercel/functions` for `waitUntil`. Use for: lessons 3 and 6.
- [Vercel webhooks API (signature validation)](https://vercel.com/docs/webhooks/webhooks-api)
  Vercel's own raw-body HMAC verification pattern. Use for: lesson 3 precedent.
- [Vercel AI SDK: RAG Agent guide](https://ai-sdk.dev/cookbook/guides/rag-chatbot) and [Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
  pgvector-based RAG example; provider tool options. Use for: an AI SDK flavoured implementation.

### Graph RAG and retrieval

- [Edge et al., "From Local to Global: A Graph RAG Approach to Query-Focused Summarization" (arXiv 2404.16130)](https://arxiv.org/abs/2404.16130)
  The original paper; global sensemaking claims. Use for: what Graph RAG was built for.
- [Microsoft GraphRAG docs](https://microsoft.github.io/graphrag/) and [repository](https://github.com/microsoft/graphrag)
  Pipeline, query modes, cost caveats, maintenance-mode status. Use for: lesson 7 mechanics.
- [Han et al., "RAG vs. GraphRAG: A Systematic Evaluation" (arXiv 2502.11371)](https://arxiv.org/abs/2502.11371)
  Independent numbers on single-hop vs multi-hop, null queries, indexing cost. Use for: when not to use a graph.
- [GraphRAG-Bench (arXiv 2506.05690)](https://arxiv.org/abs/2506.05690) and [arXiv 2604.09666](https://arxiv.org/abs/2604.09666)
  Task-type analysis and token/cost figures. Use for: lesson 7 evidence table.
- [Neo4j: The GraphRAG manifesto](https://neo4j.com/blog/genai/graphrag-manifesto/) (vendor) and [graphrag.com pattern catalog](https://graphrag.com/)
  Definitions and retriever patterns. Use for: vocabulary and when scaling up.
- [MiniSearch](https://github.com/lucaong/minisearch)
  BM25+ in JavaScript, browser and Node. Use for: FAQs past a few hundred entries.
- [graphology](https://graphology.github.io/) and [neo4j-driver for JavaScript](https://neo4j.com/docs/javascript-manual/current/)
  Graph tooling in Node. Use for: growing the graph prototype.

### FAQ-first pattern precedent

- [Rasa Open Source: Chitchat and FAQs](https://legacy-docs-oss.rasa.com/docs/rasa/chitchat-faqs)
  Retrieval intents and rules. Use for: lesson 4 framing.
- [Dialogflow CX: Generative fallback](https://docs.cloud.google.com/dialogflow/cx/docs/concept/generative/generative-fallback) and [Data stores](https://docs.cloud.google.com/dialogflow/cx/docs/concept/data-store)
  Deterministic-first ordering in a large platform. Use for: lesson 4 framing.

### Android shells

- [Capacitor docs](https://capacitorjs.com/docs) and [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
  Web-app shells for Android. Use for: lesson 8 shell decision.

## Wisdom (Communities)

- [tawk.to Community: Developers](https://community.tawk.to/c/developers)
  Official Discourse forum; tawk.to staff answer, sometimes slowly. Use for: JavaScript API and webhook questions, and to check whether the message-posting gap has changed.
- [tawk.to Community: AI Assist](https://community.tawk.to/c/community-discussion/ai-assist/14)
  Low volume, on topic. Use for: Pattern B questions.
- [Neo4j Online Community](https://community.neo4j.com/) and Neo4j Discord
  Canonical venue for GraphRAG and Cypher help. Use for: when the graph prototype grows into Neo4j.
- [Anthropic's Claude Discord](https://www.anthropic.com/discord)
  Very large; use the API-specific channels. Use for: citations, caching and tool-use questions.
- [LangChain Forum](https://forum.langchain.com/) and LlamaIndex Discord
  Retrieval-pipeline specifics; vendor-run and moderated.
- Reddit (r/Rag) could not be verified from this environment; treat as unconfirmed.

## Gaps

- Where exactly the tawk.to dashboard displays a webhook's secret key (the developer page says each webhook has one; the help articles do not say where it is shown).
- Whether the secure-mode hash for `setAttributes` must be over the email or the userId (official pages conflict; `login` is unambiguous).
- The tawk.to REST API endpoint catalogue (private behind beta access).
- A current, maintained tawk.to mobile SDK (none exists as of 2026-10-17).
