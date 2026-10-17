/**
 * Send a correctly signed, tawk.to-shaped test webhook to any URL (lesson 3).
 *   cd examples
 *   npx tsx scripts/send-test-webhook.ts https://your-app.vercel.app/api/tawk-webhook "$TAWK_WEBHOOK_SECRET" chat:start
 * Send it twice with the same event id to watch your dedupe work. Add "--tamper" to
 * corrupt the body after signing and watch the 401.
 */
import { randomUUID } from "node:crypto";
import { signTawkPayload, TAWK_EVENT_ID_HEADER, TAWK_SIGNATURE_HEADER } from "../src/tawk-webhook.js";

const [url, secret, eventName = "chat:start", ...flags] = process.argv.slice(2);
if (!url || !secret) {
  console.error("usage: tsx scripts/send-test-webhook.ts <url> <secret> [chat:start|chat:end|chat:transcript_created|ticket:create] [--tamper] [--id <eventId>]");
  process.exit(1);
}
const idFlag = flags.indexOf("--id");
const eventId = idFlag >= 0 ? (flags[idFlag + 1] ?? randomUUID()) : randomUUID();

const visitor = { name: "V1561719148780935", email: "hello@test.com", city: "jelgava", country: "LV" };
const property = { id: "58ca8453b8a7e060cd3b1ecb", name: "Bobs Burgers" };
const now = new Date().toISOString();
const payloads: Record<string, unknown> = {
  "chat:start": { event: "chat:start", chatId: randomUUID(), time: now, domain: "tawk.to", referrer: "https://www.google.com/", message: { text: "Sample message", type: "msg", sender: { type: "visitor" } }, visitor, property },
  "chat:end": { event: "chat:end", chatId: randomUUID(), time: now, domain: "tawk.to", referrer: "https://www.google.com/", visitor, property },
  "chat:transcript_created": { event: "chat:transcript_created", time: now, domain: "tawk.to", referrer: "https://www.google.com/", chat: { id: randomUUID(), visitor, messages: [{ sender: { t: "s", n: "Customer Support" }, type: "msg", msg: "👋 Hi! How can we help?", time: now }, { sender: { t: "v" }, type: "msg", msg: "Where are the e-bikes?", time: now }] }, property },
  "ticket:create": { event: "ticket:create", time: now, property, requester: { name: "Martins", email: "martins@tawk.to", type: "agent" }, ticket: { id: randomUUID(), humanId: 3, subject: "Testing", message: "Once more through the breach" } },
};
const payload = payloads[eventName];
if (!payload) {
  console.error(`unknown event ${eventName}`);
  process.exit(1);
}

let body = JSON.stringify(payload);
const signature = signTawkPayload(body, secret);
if (flags.includes("--tamper")) body = body.replace("Sample", "Tampered").replace("e-bikes", "unicorns");

const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json", [TAWK_SIGNATURE_HEADER]: signature, [TAWK_EVENT_ID_HEADER]: eventId },
  body,
});
console.log(`${eventName} → ${res.status} ${await res.text()}  (event id ${eventId})`);
