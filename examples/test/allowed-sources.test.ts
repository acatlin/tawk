import { describe, expect, it } from "vitest";
import { AllowListError, filterToAllowed, isAllowedUrl, normalizeAllowList } from "../src/allowed-sources.js";

describe("normalizeAllowList", () => {
  it("rejects schemes, wildcards in hosts, non-ASCII and empty lists", () => {
    expect(() => normalizeAllowList(["https://help.harbor.example"])).toThrow(AllowListError);
    expect(() => normalizeAllowList(["*.harbor.example"])).toThrow(AllowListError);
    expect(() => normalizeAllowList(["аmazon.com"])).toThrow(/non-ASCII/); // Cyrillic а
    expect(() => normalizeAllowList([])).toThrow(AllowListError);
  });
  it("normalises case and trailing slashes in path prefixes", () => {
    expect(normalizeAllowList(["Help.Harbor.Example/Docs/"])).toEqual([{ host: "help.harbor.example", pathPrefix: "/Docs" }]);
  });
});

describe("isAllowedUrl", () => {
  const allow = ["harbor.example", "docs.partner.example/help"];
  it("a bare domain covers itself and its subdomains", () => {
    expect(isAllowedUrl("https://harbor.example/plans", allow)).toBe(true);
    expect(isAllowedUrl("https://help.harbor.example/account/password", allow)).toBe(true);
  });
  it("does not match look-alike hosts", () => {
    expect(isAllowedUrl("https://harbor.example.evil.com/", allow)).toBe(false);
    expect(isAllowedUrl("https://notharbor.example/", allow)).toBe(false);
  });
  it("a specific subdomain with a path prefix matches only under that path", () => {
    expect(isAllowedUrl("https://docs.partner.example/help/billing", allow)).toBe(true);
    expect(isAllowedUrl("https://docs.partner.example/helpful", allow)).toBe(false);
    expect(isAllowedUrl("https://docs.partner.example/blog", allow)).toBe(false);
    expect(isAllowedUrl("https://partner.example/help", allow)).toBe(false);
  });
  it("rejects non-http schemes and garbage", () => {
    expect(isAllowedUrl("ftp://harbor.example/x", allow)).toBe(false);
    expect(isAllowedUrl("javascript:alert(1)", allow)).toBe(false);
    expect(isAllowedUrl("not a url", allow)).toBe(false);
  });
});

describe("filterToAllowed", () => {
  it("keeps only allowed items and drops items with no URL", () => {
    const items = [
      { id: 1, url: "https://help.harbor.example/a" },
      { id: 2, url: "https://elsewhere.example/b" },
      { id: 3 },
    ];
    expect(filterToAllowed(items, ["harbor.example"]).map((i) => i.id)).toEqual([1]);
  });
});
