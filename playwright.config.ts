import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], headless: true },
  webServer: {
    // The Cloudflare Nitro preset emits a Wrangler config and server entry in
    // .output/server. Avoid Nitro's broken preview wrapper and launch Wrangler
    // directly so Playwright polls the same port Wrangler serves.
    command: "bunx wrangler dev --config .output/server/wrangler.json --ip 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
