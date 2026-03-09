import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const EMPTY_STORAGE_STATE = {
  cookies: [] as [],
  origins: [] as [],
};

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: "html",
  use: {
    baseURL,
    storageState: EMPTY_STORAGE_STATE,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
