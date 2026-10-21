import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests drive the real web app against a running runranrun-api
 * (PAYMENT_GATEWAY=fake, ENABLE_DEV_ENDPOINTS=true, seeded with `pnpm db:seed`).
 * Start the API first; the web app is built and started here unless one is already on WEB_URL.
 */
const webURL = new URL(process.env.WEB_URL ?? "http://localhost:3000");
const webPort = webURL.port || (webURL.protocol === "https:" ? "443" : "80");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: webURL.origin,
    locale: "th-TH",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${webPort}`,
    url: webURL.origin,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { API_URL: process.env.API_URL ?? "http://localhost:4000", ENABLE_DEV_TOOLS: "true" },
  },
});
