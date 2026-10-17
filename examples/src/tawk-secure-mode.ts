/**
 * tawk.to secure mode (lesson 2).
 *
 * The tawk.to JavaScript API docs (https://developer.tawk.to/jsapi/, checked
 * 2026-10-17) specify:
 *   - `Tawk_API.visitor = { name, email, hash }` where `hash` is an HMAC-SHA256 of
 *     the visitor's EMAIL, computed server-side with your site's API key
 *     (Admin > Property Settings).
 *   - `Tawk_API.login({ userId, hash, ... })` where `hash` is an HMAC-SHA256 of
 *     the USER ID with the same key.
 *
 * The key never leaves your server. On Vercel, expose a small authenticated
 * route that returns the hash for the signed-in user; the browser passes it on.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** HMAC-SHA256 (hex) of an identifier (email for `visitor`, userId for `login`) with the site API key. */
export function visitorHash(identifier: string, siteApiKey: string): string {
  if (!identifier) throw new Error("identifier is required (email for visitor, userId for login)");
  if (!siteApiKey) throw new Error("TAWK_SITE_API_KEY is not set");
  return createHmac("sha256", siteApiKey).update(identifier, "utf8").digest("hex");
}

/** Constant-time check, handy in tests and in any server-side echo of the hash. */
export function verifyVisitorHash(identifier: string, hash: string, siteApiKey: string): boolean {
  const expected = Buffer.from(visitorHash(identifier, siteApiKey), "hex");
  let given: Buffer;
  try {
    given = Buffer.from(hash, "hex");
  } catch {
    return false;
  }
  if (given.length !== expected.length || given.length === 0) return false;
  return timingSafeEqual(given, expected);
}
