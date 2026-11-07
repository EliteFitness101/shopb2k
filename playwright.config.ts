import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], headless: true, baseURL: process.env.BASE_URL ?? "http://127.0.0.1:4173" },

});
