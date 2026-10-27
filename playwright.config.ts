import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], headless: true },
  webServer: {
    // This build emits a Cloudflare Worker preset and wrangler.json under
    // .output/server. Run that built worker locally instead of Vite's
    // incompatible dist/server/server.js preview entry or Node worker import.
    command: "bunx wrangler dev --config .output/server/wrangler.json --ip 127.0.0.1 --port 4173 --log-level debug",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
