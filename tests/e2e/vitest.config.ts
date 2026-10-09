// QA integration/e2e runner (qa-tester owns tests/e2e/**). Run:
//   npx vitest run --config tests/e2e/vitest.config.ts
// Playwright is not a dependency (package.json is devops-owned), so "e2e" here means
// route handlers called as real Request -> Response with only the DB, auth and provider mocked,
// jsdom UI flows, and a real `next build` bundle scan.
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = { "@": path.resolve(__dirname, "../../src") };
const root = path.resolve(__dirname, "../..");

export default defineConfig({
  root,
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "e2e-api",
          root,
          environment: "node",
          include: ["tests/e2e/api/**/*.test.ts", "tests/e2e/static/**/*.test.ts"],
          setupFiles: ["tests/e2e/setup-node.ts"],
          testTimeout: 30_000,
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "e2e-ui",
          root,
          environment: "jsdom",
          include: ["tests/e2e/ui/**/*.test.tsx"],
          setupFiles: ["tests/e2e/setup-ui.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "e2e-build",
          root,
          environment: "node",
          include: ["tests/e2e/build/**/*.test.ts"],
          testTimeout: 600_000,
          hookTimeout: 600_000,
        },
      },
      {
        // No fake env and no module mocks here: these need a real Postgres (DATABASE_URL).
        resolve: { alias },
        test: {
          name: "e2e-db",
          root,
          environment: "node",
          include: ["tests/e2e/db/**/*.test.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
