import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], headless: true },
  webServer: {
    // This repository builds a Nitro .output bundle; Vite preview incorrectly
    // looks for dist/server/server.js. Preview the actual Nitro build instead.
    command: "npx nitro preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});