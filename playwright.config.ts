import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], headless: true },
  webServer: {
    // The production build is Nitro output under .output/server. Vite preview
    // routes through TanStack's default dist/server/server.js path, which this
    // project does not generate. Launch the actual built server for smoke tests.
    command: "PORT=4173 HOST=127.0.0.1 node .output/server/index.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
