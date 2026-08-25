import { defineConfig, devices } from "@playwright/test";

// E2E covers the real editor flow in a browser. It boots the production-like
// dev server on the app's own port and drives the canvas the way a user would.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3040",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // iPad layout exercised on Chromium (the iPad Pro device descriptor defaults
    // to WebKit, whose hidden-input handling is flaky); this still drives the
    // real responsive breakpoint + touch surface.
    {
      name: "ipad",
      use: {
        browserName: "chromium",
        viewport: { width: 834, height: 1112 },
        deviceScaleFactor: 2,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3040",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
