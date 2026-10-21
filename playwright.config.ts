import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests drive the real web app against a running runranrun-api
 * (PAYMENT_GATEWAY=fake, ENABLE_DEV_ENDPOINTS=true, seeded with `pnpm db:seed`).
 * Start the API first; the web app is built and started here unless one is already on :3000.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.WEB_URL ?? "http://localhost:3000",
    locale: "th-TH",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
    env: { API_URL: process.env.API_URL ?? "http://localhost:4000", ENABLE_DEV_TOOLS: "true" },
  },
});
