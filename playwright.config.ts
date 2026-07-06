import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Courtly regression tests.
 *
 * The dev server is expected to be running at http://localhost:8080
 * (the Lovable sandbox starts it automatically). For local runs outside
 * the sandbox, start it manually with `bun run dev` before invoking
 * `bunx playwright test`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    viewport: { width: 1280, height: 1800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
