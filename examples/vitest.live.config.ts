import { defineConfig } from "vitest/config";

// Live smoke tests: real Claude API calls through the code the lessons teach.
// Each file skips itself unless ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is set.
export default defineConfig({
  test: { include: ["test/**/*.live.test.ts"], testTimeout: 60_000 },
});
