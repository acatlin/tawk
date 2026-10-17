# Established fact that reshaped the course: a third-party bot cannot post into a tawk.to chat

Verified on 2026-10-17 against developer.tawk.to, help.tawk.to and tawk.to staff statements on the community forum (March 2024, January 2025, June 2025, October 2026): no JavaScript API method, webhook, REST endpoint or automation action sends a message into a tawk.to conversation. The only official "bring your own backend" path is AI Assist calling your OpenAPI/MCP endpoint as a tool (paid plans).

## Implications

- The course teaches Pattern A (your bot is the front door; tawk.to is the human channel) as primary, Pattern B (AI Assist with your API as a tool) as the comparison, and does not pretend a bot-in-widget option exists.
- Re-check the community thread https://community.tawk.to/t/add-methods-to-post-messages-attachments-in-js-api/17059 before any future session that revisits architecture; if tawk.to ships message posting, lessons 1, 2 and 6 need revision.
- Andy has not yet demonstrated this understanding himself; this record documents the established fact, and lesson 1's quiz and recall cards are where his understanding will be evidenced.
