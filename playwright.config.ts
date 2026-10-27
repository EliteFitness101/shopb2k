import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], headless: true },
  webServer: {
    // Nitro's Cloudflare preset emits a Worker plus an asset manifest, but the
    // generated Wrangler dev server returns 404 for SSR routes in CI. Use the
    // framework's supported preview server for the built production output.
    command: "bunx vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
