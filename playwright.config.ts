import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], headless: true },
  webServer: {
    // This build uses Nitro's Cloudflare preset. Vite preview enters TanStack
    // Start's Node preview plugin, which expects dist/server/server.js and
    // fails because the Cloudflare build correctly emits .output/server/index.mjs.
    // Nitro preview delegates to the preset's Wrangler preview command instead.
    command: "bunx nitro preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
