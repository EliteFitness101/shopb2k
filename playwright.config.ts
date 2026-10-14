import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], headless: true },
  webServer: {
    // Run Nitro's generated server entry directly. The Nitro CLI preview
    // command in this dependency version throws a TDZ ReferenceError before
    // binding its HTTP listener, so Playwright can never reach the app.
    command: "NITRO_HOST=127.0.0.1 NITRO_PORT=4173 node .output/server/index.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
