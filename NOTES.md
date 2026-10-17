# Teaching notes

## Learner profile (from the first request, 2026-10-17)
- Andy (GitHub: acatlin). Strong at agentic coding, prompting, and using chatbots. First chatbot *integration* project.
- Stack: TypeScript/JS on Vercel; Claude API already working in dev and prod.
- Wrote "tawk.io"; the product is tawk.to. Gently correct, never belabour.
- Wants about 8 HTML lessons up front, a git repo, and a public GitHub repo (acatlin/tawk).
- Needs: FAQ-first answers; only one or two approved knowledge sources; some Graph RAG understanding; Android support.

## Preferences and rules I follow here
- Don't re-teach prompting or chatbot usage. Spend the lessons on integration mechanics: widget JS API, secure mode, webhooks/HMAC, retrieval tiers, handoff, Android.
- Every lesson: one win, short, TypeScript snippets, citations to official docs, a quiz with equal-length answers, and a reminder to ask the agent follow-ups.
- Code that appears in lessons lives in examples/ with tests; CI must be green before pushing.
- Keep the shared stylesheet (assets/course.css) and components (assets/*.js) as the single design system.

## Working notes
- Crux finding (2026-10-17): tawk.to's public developer surface is the widget JavaScript API, webhooks, and Zapier. The REST API is gated behind an application form, and there is no public way for a third-party bot to post replies into a chat. The course therefore teaches "your bot is the front door, tawk.to is the human-escalation channel" as the primary pattern, and native tawk.to AI Assist as the comparison pattern.

## Session log: 2026-10-17 (course built)
- Delivered 8 lessons, review page, 5 reference sheets, examples/ (47 tests green), CI workflow, MISSION/RESOURCES/GLOSSARY/learning records.
- Running example: "Harbor Bikes", a fictional bike-share programme (FAQ, three chunks, 18 triples). Reuse it in future lessons so the learner is not re-learning a domain.
- Design system: assets/course.css (tokens, dark mode, print), course.js (nav, citations → Sources list, copy buttons, checklists), quiz.js (equal-length-option quizzes, Leitner recall cards), recall-bank.js, labs: tawk-sim.js, faq-lab.js, hmac-lab.js, graph-lab.js.
- Open questions to ask Andy next session: (1) is the Android app a web shell or native Kotlin? (2) which two sources exactly? (3) does he want Pattern B's hybrid (expose answer() as an OpenAPI tool)?
- Candidate lesson 9 topics, by zone of proximal development: building the approved-source index (crawl → chunk → store on Neon/pgvector or Upstash) with contextual retrieval; evaluation set + hillclimbing for the pipeline; tawk.to Knowledge Base authoring from the FAQ with Claude.
