import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: { baseURL: process.env.APP_URL ?? "http://localhost:8081", trace: "retain-on-failure", screenshot: "only-on-failure", viewport: { width: 1280, height: 900 } },
});
