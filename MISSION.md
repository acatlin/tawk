# Mission: Integrate tawk.to into a Claude-powered chatbot (web + Android)

## Why
Andy is shipping his first chatbot integration: a TypeScript/JavaScript chatbot on Vercel whose Claude API calls already work in dev and production. He wants tawk.to as the live-chat layer so visitors get answers that come first from a curated FAQ, otherwise only from one or two approved sources (never the open web), with a clean handoff to a human, on the website and inside an Android app.

## Success looks like
- Explains, citing tawk.to's own docs, what tawk.to can and cannot do for a custom bot, and picks the integration pattern deliberately rather than by trial and error.
- Has a Vercel endpoint that verifies tawk.to webhook signatures and handles chat/ticket events.
- Drives the tawk.to widget from his app: identifies visitors with secure mode, attaches attributes/tags/events, and opens chat for handoff with context.
- Ships an answer pipeline: FAQ-first (deterministic) -> restricted-source retrieval with citations -> honest "I don't know" -> human handoff into tawk.to.
- Explains Graph RAG well enough to decide whether his corpus needs it, and can prototype a tiny graph index in JS.
- Runs the same bot + tawk.to chat inside an Android app.

## Constraints
- Stack: TypeScript/JavaScript, Vercel (Node runtime), Claude API via @anthropic-ai/sdk. Windows 11 dev machine.
- Strong at agentic coding, prompting and using chatbots; new to chat-platform integrations, webhooks/HMAC and retrieval systems.
- Lessons are HTML, short, one tangible win each, grounded in verified official docs, tested before delivery. About 8 lessons requested up front.

## Out of scope
- A general web-browsing assistant (explicitly unwanted: answers must stay inside approved sources).
- Graph-database operations (Neo4j administration); Graph RAG here means understanding plus a small prototype.
- iOS, and chat platforms other than tawk.to.

## Open assumptions (confirm with Andy)
1. "Integrated API" means the Claude API, called from Vercel functions.
2. The Android app may be a WebView/Capacitor shell of the web app rather than a from-scratch Kotlin app.
3. The one or two approved sources are web pages or documents Andy controls (the lessons use a docs site + a FAQ file as the running example).
