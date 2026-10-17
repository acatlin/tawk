/**
 * Vercel Function: POST /api/tawk-webhook
 *
 * Uses the web-standard handler signature that Vercel Functions support
 * (`export function POST(request: Request)`), so the raw body is simply
 * `await request.text()`: no body-parser to disable, nothing re-serialised
 * before the HMAC check. Vercel's own webhook docs verify their signature the
 * same way. See https://vercel.com/docs/functions/functions-api-reference.
 *
 * Deploy notes (lesson 3):
 *   - Set TAWK_WEBHOOK_SECRET in Vercel for every environment you register a webhook for.
 *   - Register https://<your-app>/api/tawk-webhook in tawk.to: Administration > Settings > Webhooks.
 *   - Respond fast: tawk.to times out at 30 s and retries for 12 h; do slow work after you respond
 *     (a queue, or `waitUntil` from @vercel/functions).
 */
import { handleTawkWebhook, MemoryWebhookStore, TAWK_EVENT_ID_HEADER, TAWK_SIGNATURE_HEADER } from "../src/tawk-webhook.js";

// Replace with a shared store (Postgres, KV). Memory is per-instance and is lost between invocations.
const store = new MemoryWebhookStore();

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const result = await handleTawkWebhook(
    {
      rawBody,
      signature: request.headers.get(TAWK_SIGNATURE_HEADER),
      eventId: request.headers.get(TAWK_EVENT_ID_HEADER),
    },
    {
      secret: process.env["TAWK_WEBHOOK_SECRET"] ?? "",
      store,
      onEvent: async (event) => {
        if (event.event === "chat:transcript_created") {
          // e.g. enqueue for FAQ mining (lesson 4) and for the handoff log (lesson 6)
          console.log(`transcript for chat ${event.chat.id}: ${event.chat.messages.length} messages`);
        }
      },
    },
  );
  return new Response(result.body, { status: result.status, headers: { "content-type": "text/plain" } });
}

export function GET(): Response {
  return new Response("tawk.to webhook endpoint: POST only", { status: 405 });
}
