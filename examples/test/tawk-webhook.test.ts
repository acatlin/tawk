import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  handleTawkWebhook,
  MemoryWebhookStore,
  parseTawkEvent,
  signTawkPayload,
  transcriptToText,
  verifyTawkSignature,
  type TawkTranscriptCreated,
} from "../src/tawk-webhook.js";

const SECRET = "whsec_demo";
// Payload shapes follow the examples at https://developer.tawk.to/webhooks/ (checked 2026-10-17).
const chatStart = JSON.stringify({
  event: "chat:start",
  chatId: "70fe3290-99ad-11e9-a30a-51567162179f",
  time: "2019-06-28T14:03:04.646Z",
  domain: "tawk.to",
  referrer: "https://www.google.com/",
  message: { text: "Sample message", type: "msg", sender: { type: "visitor" } },
  visitor: { name: "V1561719148780935", email: "hello@test.com", city: "jelgava", country: "LV" },
  property: { id: "58ca8453b8a7e060cd3b1ecb", name: "Bobs Burgers" },
});

describe("signature", () => {
  it("is HMAC-SHA1 hex over the raw body (independent oracle)", () => {
    const oracle = createHmac("sha1", SECRET).update(chatStart).digest("hex");
    expect(signTawkPayload(chatStart, SECRET)).toBe(oracle);
    expect(oracle).toMatch(/^[0-9a-f]{40}$/);
  });
  it("verifies the genuine signature and rejects tampering, re-serialisation and garbage", () => {
    const sig = signTawkPayload(chatStart, SECRET);
    expect(verifyTawkSignature(chatStart, sig, SECRET)).toBe(true);
    expect(verifyTawkSignature(chatStart.replace("Sample", "Tampered"), sig, SECRET)).toBe(false);
    const pretty = JSON.stringify(JSON.parse(chatStart), null, 2); // same data, different bytes
    expect(verifyTawkSignature(pretty, sig, SECRET)).toBe(false);
    expect(verifyTawkSignature(chatStart, "deadbeef", SECRET)).toBe(false);
    expect(verifyTawkSignature(chatStart, null, SECRET)).toBe(false);
    expect(verifyTawkSignature(chatStart, "zz".repeat(20), SECRET)).toBe(false);
  });
});

describe("parseTawkEvent", () => {
  it("accepts the four documented events and rejects others", () => {
    expect(parseTawkEvent(chatStart).event).toBe("chat:start");
    expect(() => parseTawkEvent("not json")).toThrow(/not JSON/);
    expect(() => parseTawkEvent(JSON.stringify({ hello: 1 }))).toThrow(/missing event/);
    expect(() => parseTawkEvent(JSON.stringify({ event: "chat:message" }))).toThrow(/unknown event/);
  });
});

describe("handleTawkWebhook", () => {
  const req = (over: Partial<{ rawBody: string; signature: string | null; eventId: string | null }> = {}) => ({
    rawBody: chatStart,
    signature: signTawkPayload(chatStart, SECRET),
    eventId: "evt-1",
    ...over,
  });

  it("stores a verified event and calls onEvent", async () => {
    const store = new MemoryWebhookStore();
    const onEvent = vi.fn();
    const res = await handleTawkWebhook(req(), { secret: SECRET, store, onEvent });
    expect(res.status).toBe(200);
    expect(store.events).toHaveLength(1);
    expect(onEvent).toHaveBeenCalledOnce();
  });
  it("rejects a bad signature before parsing anything", async () => {
    const store = new MemoryWebhookStore();
    const res = await handleTawkWebhook(req({ signature: "00".repeat(20), rawBody: "{not json" }), { secret: SECRET, store });
    expect(res.status).toBe(401);
    expect(store.events).toHaveLength(0);
  });
  it("returns 400 for a verified but malformed body", async () => {
    const body = JSON.stringify({ event: "nope" });
    const res = await handleTawkWebhook({ rawBody: body, signature: signTawkPayload(body, SECRET), eventId: null }, { secret: SECRET, store: new MemoryWebhookStore() });
    expect(res.status).toBe(400);
  });
  it("ignores a retry with the same X-Hook-Event-Id", async () => {
    const store = new MemoryWebhookStore();
    const onEvent = vi.fn();
    await handleTawkWebhook(req(), { secret: SECRET, store, onEvent });
    const again = await handleTawkWebhook(req(), { secret: SECRET, store, onEvent });
    expect(again.status).toBe(200);
    expect(again.body).toMatch(/duplicate/);
    expect(store.events).toHaveLength(1);
    expect(onEvent).toHaveBeenCalledOnce();
  });
  it("fails closed when the secret is missing", async () => {
    const res = await handleTawkWebhook(req(), { secret: "", store: new MemoryWebhookStore() });
    expect(res.status).toBe(500);
  });
});

describe("transcriptToText", () => {
  it("flattens sender types a/v/s into readable lines", () => {
    const t: TawkTranscriptCreated = {
      event: "chat:transcript_created",
      time: "2024-07-03T01:02:37.780Z",
      domain: "tawk.to",
      chat: {
        id: "c1",
        visitor: { name: "V1" },
        messages: [
          { sender: { t: "s", n: "Customer Support" }, type: "msg", msg: "Hi! How can we help?", time: "t1" },
          { sender: { t: "v" }, type: "msg", msg: "Tell me more", time: "t2" },
          { sender: { t: "a", n: "Eugene", id: "a1" }, type: "msg", time: "t3", attchs: [{ type: "file", content: { file: { url: "u", name: "n", mimeType: "image/png", size: 1, extension: "png" } } }] },
        ],
      },
      property: { id: "p", name: "Bobs Burgers" },
    };
    expect(transcriptToText(t)).toBe("system (Customer Support): Hi! How can we help?\nvisitor: Tell me more\nagent (Eugene): [1 attachment(s)]");
  });
});
