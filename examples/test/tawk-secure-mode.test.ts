import { describe, expect, it } from "vitest";
import { verifyVisitorHash, visitorHash } from "../src/tawk-secure-mode.js";

// Vectors computed independently with Node's crypto (and matched by the browser
// simulator's WebCrypto implementation in assets/tawk-sim.js).
const KEY = "sim-site-api-key";

describe("visitorHash", () => {
  it("is HMAC-SHA256 hex of the email with the site API key", () => {
    expect(visitorHash("andy@example.com", KEY)).toBe("4da6656a520021c8889112cee47cd2047666b81184a609ea86560259b96fa237");
  });
  it("hashes a userId for the login() flow the same way", () => {
    expect(visitorHash("user-42", KEY)).toBe("a02dcc36e63d36cef3c8516a5b6bf6a36f3597293bd0089dff43a1e3c6d6d991");
  });
  it("refuses to run without an identifier or key", () => {
    expect(() => visitorHash("", KEY)).toThrow();
    expect(() => visitorHash("a@b.c", "")).toThrow(/TAWK_SITE_API_KEY/);
  });
});

describe("verifyVisitorHash", () => {
  it("accepts the right hash and rejects wrong, short or malformed ones", () => {
    const good = visitorHash("andy@example.com", KEY);
    expect(verifyVisitorHash("andy@example.com", good, KEY)).toBe(true);
    expect(verifyVisitorHash("andy@example.com", good.replace(/^4/, "5"), KEY)).toBe(false);
    expect(verifyVisitorHash("andy@example.com", "abcd", KEY)).toBe(false);
    expect(verifyVisitorHash("andy@example.com", "not-hex!!", KEY)).toBe(false);
  });
});
