/**
 * tawk.to webhooks (lesson 3): verify, dedupe, dispatch.
 *
 * Facts from https://developer.tawk.to/webhooks/ and
 * https://help.tawk.to/article/creating-and-managing-webhooks (checked 2026-10-17):
 *   - Events: chat:start, chat:end, chat:transcript_created, ticket:create. Nothing fires per message.
 *   - Signature: "The HMAC-SHA1 algorithm is used to generate the webhook payload signature",
 *     hex digest over the raw body, sent in the X-Tawk-Signature header.
 *   - Retries: anything but a 2XX, or no response within 30 seconds, is retried for up to 12 hours.
 *     X-Hook-Event-Id stays the same across retries, so dedupe on it.
 *   - Transcript webhooks fire after 3 minutes of inactivity once all chats in a session have ended.
 *
 * Verify the RAW body bytes. Re-serialising parsed JSON changes whitespace and key order and the
 * signature no longer matches.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const TAWK_SIGNATURE_HEADER = "x-tawk-signature";
export const TAWK_EVENT_ID_HEADER = "x-hook-event-id";

export interface TawkVisitor {
  name: string;
  email?: string;
  city?: string;
  country?: string;
}
export interface TawkProperty {
  id: string;
  name: string;
}
export interface TawkChatStart {
  event: "chat:start";
  chatId: string;
  time: string;
  domain: string;
  referrer?: string;
  message: { text: string; type: "msg" | "file" | "webrtc-call"; sender: { type: "agent" | "visitor" | "system" } };
  visitor: TawkVisitor;
  property: TawkProperty;
}
export interface TawkChatEnd {
  event: "chat:end";
  chatId: string;
  time: string;
  domain: string;
  referrer?: string;
  visitor: TawkVisitor;
  property: TawkProperty;
}
export interface TawkTranscriptMessage {
  sender: { t: "a" | "v" | "s"; n?: string; id?: string };
  type: string;
  msg?: string;
  time: string;
  attchs?: { type: string; content: { file: { url: string; name: string; mimeType: string; size: number; extension: string } } }[];
}
export interface TawkTranscriptCreated {
  event: "chat:transcript_created";
  time: string;
  domain: string;
  referrer?: string;
  chat: { id: string; visitor: TawkVisitor; messages: TawkTranscriptMessage[] };
  property: TawkProperty;
}
export interface TawkTicketCreate {
  event: "ticket:create";
  time: string;
  property: TawkProperty;
  requester: { name: string; email: string; type?: string };
  ticket: { id: string; humanId: number; subject: string; message: string };
}
export type TawkEvent = TawkChatStart | TawkChatEnd | TawkTranscriptCreated | TawkTicketCreate;
export const TAWK_EVENTS = ["chat:start", "chat:end", "chat:transcript_created", "ticket:create"] as const;

/** HMAC-SHA1 hex of the raw body, exactly as tawk.to computes X-Tawk-Signature. */
export function signTawkPayload(rawBody: string | Buffer, secret: string): string {
  if (!secret) throw new Error("TAWK_WEBHOOK_SECRET is not set");
  return createHmac("sha1", secret).update(rawBody).digest("hex");
}

/** Constant-time comparison of the header value with our own digest of the raw body. */
export function verifyTawkSignature(rawBody: string | Buffer, signature: string | null | undefined, secret: string): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signTawkPayload(rawBody, secret), "hex");
  let given: Buffer;
  try {
    given = Buffer.from(signature.trim(), "hex");
  } catch {
    return false;
  }
  if (given.length !== expected.length || given.length === 0) return false;
  return timingSafeEqual(given, expected);
}

export class TawkWebhookError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "TawkWebhookError";
  }
}

/** Parses and minimally validates a payload. Throws TawkWebhookError(400) on malformed input. */
export function parseTawkEvent(rawBody: string): TawkEvent {
  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new TawkWebhookError(400, "body is not JSON");
  }
  if (!data || typeof data !== "object" || typeof (data as { event?: unknown }).event !== "string") {
    throw new TawkWebhookError(400, "missing event field");
  }
  const event = (data as { event: string }).event;
  if (!(TAWK_EVENTS as readonly string[]).includes(event)) throw new TawkWebhookError(400, `unknown event ${event}`);
  return data as TawkEvent;
}

/** Whatever you persist to: Postgres, KV, a queue. Must be shared across function instances. */
export interface WebhookStore {
  /** Returns true if this event id was already processed (idempotency on retries). */
  seen(eventId: string): Promise<boolean>;
  markSeen(eventId: string): Promise<void>;
  save(event: TawkEvent, eventId: string | null): Promise<void>;
}

export interface WebhookRequest {
  rawBody: string;
  signature: string | null;
  eventId: string | null;
}

export interface WebhookDeps {
  secret: string;
  store: WebhookStore;
  /** Optional hook for side effects (notify a channel, kick off FAQ mining). Keep it fast: tawk.to waits 30 s. */
  onEvent?: (event: TawkEvent) => Promise<void> | void;
}

export interface WebhookResult {
  status: number;
  body: string;
}

/**
 * Framework-agnostic handler. Order matters: verify before parsing (never JSON.parse an unverified
 * body), dedupe before side effects, respond 2XX quickly so tawk.to stops retrying.
 */
export async function handleTawkWebhook(req: WebhookRequest, deps: WebhookDeps): Promise<WebhookResult> {
  if (!deps.secret) return { status: 500, body: "webhook secret not configured" };
  if (!verifyTawkSignature(req.rawBody, req.signature, deps.secret)) return { status: 401, body: "invalid signature" };

  let event: TawkEvent;
  try {
    event = parseTawkEvent(req.rawBody);
  } catch (e) {
    if (e instanceof TawkWebhookError) return { status: e.status, body: e.message };
    throw e;
  }

  if (req.eventId && (await deps.store.seen(req.eventId))) return { status: 200, body: "duplicate ignored" };

  await deps.store.save(event, req.eventId);
  if (req.eventId) await deps.store.markSeen(req.eventId);
  if (deps.onEvent) await deps.onEvent(event);
  return { status: 200, body: `ok ${event.event}` };
}

/** In-memory store for tests and local experiments. Not shared across serverless instances: use a database in production. */
export class MemoryWebhookStore implements WebhookStore {
  readonly events: { event: TawkEvent; eventId: string | null }[] = [];
  private readonly ids = new Set<string>();
  async seen(eventId: string): Promise<boolean> {
    return this.ids.has(eventId);
  }
  async markSeen(eventId: string): Promise<void> {
    this.ids.add(eventId);
  }
  async save(event: TawkEvent, eventId: string | null): Promise<void> {
    this.events.push({ event, eventId });
  }
}

/** Flattens a transcript into "role: text" lines, handy for FAQ mining and for summaries. */
export function transcriptToText(t: TawkTranscriptCreated): string {
  const role = { a: "agent", v: "visitor", s: "system" } as const;
  return t.chat.messages
    .map((m) => `${role[m.sender.t]}${m.sender.n ? ` (${m.sender.n})` : ""}: ${m.msg ?? (m.attchs?.length ? `[${m.attchs.length} attachment(s)]` : "")}`)
    .join("\n");
}
