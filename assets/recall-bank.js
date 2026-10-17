/* ------------------------------------------------------------------
   recall-bank.js — every recall card in the course, by id.
   Lessons render their own cards from this bank; lessons/review.html
   renders all of them, due-first, for spaced retrieval practice.
   Keep answers short: the point is to check recall, not to re-teach.
   ------------------------------------------------------------------ */
window.RECALL_BANK = [
  /* ---------- lesson 1 ---------- */
  { id: 'l1-closed-door', lesson: 1, prompt: 'What is the one thing a third-party bot cannot do with tawk.to, and what evidence would you cite?',
    answer: '<p>It cannot post a message into a tawk.to chat. No JavaScript API method sends (the closest, <code>setChatInputMessage</code>, only pre-fills the input), webhooks are outbound only, the gated REST API lists no messaging capability, and Zapier/Make expose triggers only. tawk.to staff said so on the community forum in March 2024, January 2025, June 2025 and again in October 2026.</p>' },
  { id: 'l1-surfaces', lesson: 1, prompt: 'List tawk.to’s developer surfaces and the direction each one runs.',
    answer: '<ul><li>JavaScript API: browser → widget (identify, attributes, tags, events, open/hide, callbacks).</li><li>Webhooks: tawk.to → your server, four events, HMAC-SHA1 signed.</li><li>Direct Chat Link: link out to a standalone chat page, no parameters.</li><li>REST API (by request): your server → tawk.to for management, not messaging.</li><li>AI Assist custom tools (paid): tawk.to → your OpenAPI/MCP endpoint.</li><li>Mobile: no SDK; official WebView samples.</li></ul>' },
  { id: 'l1-patterns', lesson: 1, prompt: 'Name the three integration patterns and the single question that separates A from B.',
    answer: '<p>A: your bot is the front door, tawk.to is the human channel. B: tawk.to AI Assist is the front door, your API is one of its tools. C: no bot, just humans plus Knowledge Base cards, triggers and shortcuts. The separating question: must the whole experience live inside the tawk.to widget? If yes, your model cannot be the one speaking (B); if no, it can (A).</p>' },

  /* ---------- lesson 2 ---------- */
  { id: 'l2-after-onload', lesson: 2, prompt: 'Why must most <code>Tawk_API</code> calls wait for <code>onLoad</code>, and which three settings are the exception?',
    answer: '<p>Methods need the widget script loaded; the reference wraps every example in <code>onLoad</code> and the help centre calls early calls the most common mistake. The exceptions run the other way: <code>visitor</code>, <code>customStyle</code> and <code>autoStart</code> must be set <em>before</em> the script loads, because they are read at load time and ignored afterwards.</p>' },
  { id: 'l2-secure-mode', lesson: 2, prompt: 'Describe the secure-mode flow end to end, including where the key lives.',
    answer: '<p>Your server computes HMAC-SHA256 (hex) of the identifier with the property’s JavaScript API key (Administration → Overview → JavaScript API → enable Secure Mode → copy). The reference hashes the email for <code>visitor</code>/<code>setAttributes</code> and the userId for <code>login</code>. The browser passes name/email/hash, or <code>login({ userId, hash })</code> to restore previous conversations. A wrong hash means the widget silently ignores the details; <code>login</code> logs a 401.</p>' },
  { id: 'l2-limits', lesson: 2, prompt: 'List the documented limits that bite during a handoff.',
    answer: '<ul><li>50 custom attributes; keys alphanumeric and dashes, lower-cased; values non-empty, ≤ 255 characters.</li><li>10 tags.</li><li>Event names alphanumeric and dashes.</li><li><code>setChatInputMessage</code> drafts only; the visitor must press Send.</li><li>Most callbacks are not supported in the pop-out window.</li></ul>' },

  /* ---------- lesson 3 ---------- */
  { id: 'l3-raw-body', lesson: 3, prompt: 'Why verify the webhook signature over the raw body, and how do you get the raw body in a Vercel function?',
    answer: '<p>The HMAC-SHA1 in <code>X-Tawk-Signature</code> is over the exact bytes tawk.to sent; re-serialising parsed JSON changes whitespace and key order. In a web-standard handler, <code>const rawBody = await request.text()</code> before any <code>JSON.parse</code>; compare with <code>crypto.timingSafeEqual</code> after checking lengths.</p>' },
  { id: 'l3-retries', lesson: 3, prompt: 'State tawk.to’s retry policy and the two things it demands of your endpoint.',
    answer: '<p>Any non-2XX response, or no response within 30 seconds, is retried for up to 12 hours with the same <code>X-Hook-Event-Id</code>. So: (1) make processing idempotent by storing seen event ids in a shared store; (2) respond quickly and do slow work after responding.</p>' },
  { id: 'l3-events', lesson: 3, prompt: 'Name the four webhook events and the one thing none of them provides.',
    answer: '<p><code>chat:start</code> (first message), <code>chat:end</code>, <code>chat:transcript_created</code> (after all chats in a session end and 3 minutes of inactivity), <code>ticket:create</code>. None of them streams messages live; there is no per-message event. Payloads also omit your custom attributes and tags.</p>' },

  /* ---------- lesson 4 ---------- */
  { id: 'l4-why-first', lesson: 4, prompt: 'Name three properties of the FAQ tier that justify running it before any model call.',
    answer: '<p>Deterministic (same curated wording every time), cheap and fast (no tokens, microseconds), and auditable (you can list every answer it will ever give), with zero hallucination risk. Precedent: Rasa retrieval intents with rules; Dialogflow CX generative fallback only when no intent matches.</p>' },
  { id: 'l4-two-dials', lesson: 4, prompt: 'What are the matcher’s two dials and what failure does each prevent?',
    answer: '<p><strong>Threshold</strong>: the minimum top score; prevents weak matches from answering. <strong>Ambiguity margin</strong>: the minimum gap between the top two scores; prevents sibling entries (“change email” vs “change email password”) from answering the wrong one.</p>' },
  { id: 'l4-wrong-vs-missed', lesson: 4, prompt: 'Why tune for zero wrong answers before fewest missed?',
    answer: '<p>A missed FAQ hit falls through to retrieval, which can still answer with citations or hand off. A wrong FAQ hit serves a confident, verbatim answer to the wrong question and the visitor cannot tell. The costs are asymmetric, so eliminate wrong first, then recover misses with a lower threshold or new variants from transcripts.</p>' },

  /* ---------- lesson 5 ---------- */
  { id: 'l5-url-validation', lesson: 5, prompt: 'What is web fetch’s prior-context rule and how do you satisfy it for your approved URLs?',
    answer: '<p>Web fetch only fetches URLs that already appeared in the conversation: user messages, client tool results, or earlier search/fetch results. A URL only in the system prompt fails with <code>url_not_in_prior_context</code>. Put the approved URLs in a user message.</p>' },
  { id: 'l5-domain-rules', lesson: 5, prompt: 'Recite the domain-filter rules for <code>allowed_domains</code>.',
    answer: '<ul><li>No scheme.</li><li>A bare domain includes its subdomains; a named subdomain restricts to itself.</li><li>Paths work for web search only; web fetch matches the domain only.</li><li><code>allowed_domains</code> and <code>blocked_domains</code> cannot be combined (400).</li><li>Wildcards only in paths.</li><li>ASCII-only hostnames (homograph attacks).</li></ul>' },
  { id: 'l5-sentinel', lesson: 5, prompt: 'How does the pipeline detect “not in my sources” without parsing prose, and what counts as grounded?',
    answer: '<p>The system prompt tells the model to reply with exactly <code>NOT_IN_SOURCES</code> when the documents do not answer; the parser treats that as not grounded and drops citations. Grounded means non-empty text <em>and</em> at least one citation into an allowed chunk. Citations come from <code>document</code> blocks with <code>citations: { enabled: true }</code>.</p>' },

  /* ---------- lesson 6 ---------- */
  { id: 'l6-order', lesson: 6, prompt: 'Recite the tier order and give the one-sentence reason for each boundary.',
    answer: '<p>Human requested → FAQ → approved sources → fallback. Boundaries: a request for a person must never be argued with; deterministic and free before probabilistic and paid; the allow-list filter runs before the model as defence in depth; a model answer without an allowed citation counts as a fallback; a fallback is a handoff offer, never a dead end.</p>' },
  { id: 'l6-handoff-policy', lesson: 6, prompt: 'What triggers a handoff and what travels with the visitor?',
    answer: '<p>Triggers: explicit request (immediate), any fallback (button; automatic on the second), escalation vocabulary (always show the button), near-threshold FAQ hits (“did that help?”); offline status routes to a ticket instead. Travels: <code>login</code> identity, attributes <code>bot-last-tier</code>/<code>bot-last-reason</code>, tag and event <code>bot-handoff</code>, and a drafted summary ending with a session reference.</p>' },
  { id: 'l6-native-vs-custom', lesson: 6, prompt: 'Give three measurable differences between your pipeline and tawk.to AI Assist.',
    answer: '<ul><li>Retrieval: your retriever vs “up to 5 chunks” per inquiry.</li><li>Scope: code-enforced allow-list vs Instructions text plus sitemap-scoped crawl, no strict switch.</li><li>Cost: Claude tokens vs credits (“Auto costs 3 credits per reply”; Growth $29 for 1,000).</li><li>Citations: per sentence from the API vs none documented.</li><li>Escalation: your policy vs native escalation on paid plans.</li></ul>' },

  /* ---------- lesson 7 ---------- */
  { id: 'l7-definition', lesson: 7, prompt: 'Define Graph RAG in one sentence and name Microsoft GraphRAG’s two main query modes.',
    answer: '<p>“GraphRAG is RAG, where the Retrieval path includes a knowledge graph” (Neo4j). Local search combines the entity graph with text chunks for entity-specific questions; Global search map-reduces over community reports for questions about the dataset as a whole.</p>' },
  { id: 'l7-when', lesson: 7, prompt: 'List the signals that justify adding a graph index, and the evidence that otherwise says don’t.',
    answer: '<p>Add a graph when transcripts show multi-hop/relational failures, when you need corpus-wide thematic answers, or when you need explainable traversal paths. Otherwise: on single-hop facts plain RAG matched or beat GraphRAG (NQ F1 64.78 vs 63.01), global search hallucinated on unanswerable queries (19.27 vs 96.01), and GraphRAG-Bench found basic RAG “comparable to or outperforms GraphRAG in simple fact retrieval.”</p>' },
  { id: 'l7-cost', lesson: 7, prompt: 'Give two measured cost facts about Graph RAG indexing or querying.',
    answer: '<p>Indexing 135 s (RAG) vs 5,560–7,702 s (two GraphRAG variants) on the same corpus (arXiv 2502.11371); build cost $13.19 per 1M tokens with ~22k context tokens per query (arXiv 2604.09666); prompt tokens per query 879 (vanilla) vs ~38.7k (MS-GraphRAG local) vs ~331k (global) in GraphRAG-Bench. Microsoft: indexing “can be an expensive operation”; LazyGraphRAG indexes at 0.1% of the cost.</p>' },

  /* ---------- lesson 8 ---------- */
  { id: 'l8-webview', lesson: 8, prompt: 'Describe tawk.to’s official Android approach and the settings its sample enables.',
    answer: '<p>No SDK; a Kotlin sample app wraps the widget in a WebView: JavaScript, DOM storage, database and file access enabled, a WebChromeClient for file chooser and permission prompts, HTML template loaded with <code>loadDataWithBaseURL("https://embed.tawk.to/", …)</code>, and a <code>@JavascriptInterface</code> bridge for callbacks. minSdk 24; two commits from September 2023, so copy it rather than depend on it.</p>' },
  { id: 'l8-identity-android', lesson: 8, prompt: 'How does a visitor keep one conversation across web and Android?',
    answer: '<p>Both call the same identity route, get <code>{ userId, hash }</code> (HMAC-SHA256 of the userId with the site API key, computed server-side), and call <code>Tawk_API.login({ userId, hash, … })</code>, which “will retrieved the conversation of the user if it has existing before.” The key never ships to the device.</p>' },
  { id: 'l8-same-backend', lesson: 8, prompt: 'What changes and what does not when you add Android?',
    answer: '<p>Unchanged: the Vercel API, <code>answer()</code>, the guards, the webhooks. New: a shell (Trusted Web Activity, Capacitor, or native Kotlin), a WebView chat screen with bridged callbacks, <code>shutdown()</code>/<code>start()</code> on pause/resume, upload permissions, and an offline path. The Direct Chat Link is the zero-code fallback but cannot be pre-filled.</p>' }
];
