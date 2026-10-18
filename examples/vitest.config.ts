import { configDefaults, defineConfig } from "vitest/config";

// Offline suite: `npm test`. Live tests (*.live.test.ts) call the real Claude
// API and run separately via `npm run test:live` (vitest.live.config.ts).
export default defineConfig({
  test: { include: ["test/**/*.test.ts"], exclude: [...configDefaults.exclude, "test/**/*.live.test.ts"] },
});
