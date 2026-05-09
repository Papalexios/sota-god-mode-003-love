import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E for the landing page.
 * Runs against a local Vite preview build on http://localhost:4173.
 *
 * Locally:   bunx playwright install --with-deps && bun run e2e
 * In CI:     handled by .github/workflows/e2e.yml
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:4173",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "bun run build && bun run preview -- --port 4173 --strictPort",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "desktop-firefox",
      use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-iphone",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "mobile-pixel",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
