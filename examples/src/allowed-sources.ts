/**
 * Approved-source policy: the guard that keeps answers inside one or two places.
 *
 * The matching rules deliberately mirror the domain-filtering rules of Claude's
 * server tools (web_search / web_fetch `allowed_domains`), as documented at
 * https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools#domain-filtering
 * (checked 2026-10-17):
 *   - entries carry no scheme ("docs.example.com", not "https://docs.example.com")
 *   - a bare domain covers its subdomains; a specific subdomain covers only itself
 *   - an optional path prefix narrows further ("example.com/help")
 *   - wildcards are not allowed in the host part
 *   - use ASCII-only hostnames (homograph attacks: Cyrillic "а" in "аmazon.com")
 *
 * Use it in three places: when you build the index (only crawl allowed URLs),
 * when you pass retrieved chunks to the model (drop anything else), and when you
 * post-check citations before showing them to a visitor.
 */

export interface AllowEntry {
  host: string;
  /** Optional path prefix, always starting with "/" and without a trailing "/" (except root). */
  pathPrefix?: string;
}

export class AllowListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AllowListError";
  }
}

const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** Validates and normalises allow-list entries. Throws AllowListError on bad input. */
export function normalizeAllowList(entries: string[]): AllowEntry[] {
  if (entries.length === 0) throw new AllowListError("allow list is empty: the bot would have no approved source");
  return entries.map((raw) => {
    const e = raw.trim();
    if (/^[a-z]+:\/\//i.test(e)) throw new AllowListError(`"${raw}": do not include the scheme, use "${e.replace(/^[a-z]+:\/\//i, "")}"`);
    // eslint-disable-next-line no-control-regex
    if (/[^\x00-\x7F]/.test(e)) throw new AllowListError(`"${raw}": non-ASCII characters are not allowed (homograph risk)`);
    const slash = e.indexOf("/");
    const host = (slash >= 0 ? e.slice(0, slash) : e).toLowerCase();
    let pathPrefix = slash >= 0 ? e.slice(slash) : undefined;
    if (host.includes("*")) throw new AllowListError(`"${raw}": wildcards are not allowed in the host`);
    if (!HOST_RE.test(host)) throw new AllowListError(`"${raw}": "${host}" is not a valid hostname`);
    if (pathPrefix !== undefined) {
      pathPrefix = pathPrefix.replace(/\/+$/, "") || "/";
      if (pathPrefix.includes("*")) throw new AllowListError(`"${raw}": wildcards in paths are not supported by this guard`);
    }
    return pathPrefix !== undefined ? { host, pathPrefix } : { host };
  });
}

function hostMatches(hostname: string, host: string): boolean {
  return hostname === host || hostname.endsWith("." + host);
}

function pathMatches(pathname: string, prefix: string | undefined): boolean {
  if (prefix === undefined || prefix === "/") return true;
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** True when `url` is http(s) and matches at least one allow-list entry. Malformed URLs are never allowed. */
export function isAllowedUrl(url: string, allow: string[] | AllowEntry[]): boolean {
  const entries: AllowEntry[] = typeof allow[0] === "string" ? normalizeAllowList(allow as string[]) : (allow as AllowEntry[]);
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const hostname = u.hostname.toLowerCase();
  const pathname = u.pathname.replace(/\/+$/, "") || "/";
  return entries.some((e) => hostMatches(hostname, e.host) && pathMatches(pathname, e.pathPrefix));
}

/** Keeps only items whose URL is allowed. Items without a URL are dropped (unknown provenance is not provenance). */
export function filterToAllowed<T extends { url?: string }>(items: T[], allow: string[] | AllowEntry[]): T[] {
  const entries = typeof allow[0] === "string" ? normalizeAllowList(allow as string[]) : (allow as AllowEntry[]);
  return items.filter((it) => typeof it.url === "string" && isAllowedUrl(it.url, entries));
}
