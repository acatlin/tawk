// Checks that every local href/src in the HTML pages points at a file that exists,
// and that every recall card id used in a lesson exists in assets/recall-bank.js.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pages = [];
for (const dir of [".", "lessons", "reference"]) {
  for (const f of readdirSync(join(root, dir))) if (f.endsWith(".html")) pages.push(join(root, dir, f));
}
const bank = readFileSync(join(root, "assets", "recall-bank.js"), "utf8");
const bankIds = new Set([...bank.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));
let errors = 0;
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  for (const m of html.matchAll(/(?:href|src)="([^"#?]+)[^"]*"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|javascript:|data:)/.test(ref)) continue;
    const target = resolve(dirname(page), ref);
    if (!existsSync(target) || !statSync(target).isFile()) { console.error(`${page}: missing ${ref}`); errors++; }
  }
  for (const m of html.matchAll(/class="recall" data-id="([^"]+)"/g)) {
    if (!bankIds.has(m[1])) { console.error(`${page}: recall id ${m[1]} not in recall-bank.js`); errors++; }
  }
}
console.log(`${pages.length} pages checked, ${bankIds.size} recall cards in bank, ${errors} error(s)`);
process.exit(errors ? 1 : 0);
