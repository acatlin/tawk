/**
 * Smoke test for lesson 5: ask a grounded question against the fixture chunks.
 *   cd examples && npx tsx scripts/ask-grounded.ts "Which support channel do annual members get?"
 * Needs ANTHROPIC_API_KEY (or an `ant auth login` profile). Costs a few cents.
 */
import { groundedAnswer } from "../src/grounded-answer.js";
import { CHUNKS } from "../test/fixtures.js";

const question = process.argv.slice(2).join(" ") || "Which support channel do annual members get?";
const result = await groundedAnswer(question, CHUNKS);
console.log("\nQ:", question);
console.log("grounded:", result.grounded);
console.log("A:", result.text || "(empty)");
for (const c of result.citations) console.log(`  ↳ ${c.title} <${c.url}> — “${c.quote}”`);
