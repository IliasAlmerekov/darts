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
const baseUrlParts = new URL(baseURL);
const devServerHost = baseUrlParts.hostname;
const devServerPort = baseUrlParts.port || (baseUrlParts.protocol === "https:" ? "443" : "80");
const ciWorkersRaw = process.env.PLAYWRIGHT_WORKERS;
const ciWorkers = ciWorkersRaw === undefined ? 2 : Number.parseInt(ciWorkersRaw, 10);
const workers =
  process.env.CI && Number.isFinite(ciWorkers) && ciWorkers > 0 ? ciWorkers : undefined;

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(workers === undefined ? {} : { workers }),
  reporter: "html",
  use: {
    baseURL,
    storageState: EMPTY_STORAGE_STATE,
    trace: "on-first-retry",
  },

  projects: [
    {
      // Deterministic suite: no secrets, every /api request answered by a route mock.
      name: "mocked",
      testMatch: "**/*.spec.ts",
      testIgnore: ["**/shared/**", "live/**"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "live-preflight",
      testMatch: "live/preflight.setup.ts",
    },
    {
      // Opt-in suite against a real backend; the preflight fails the run when it is unreachable.
      name: "live",
      testMatch: "live/**/*.spec.ts",
      dependencies: ["live-preflight"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: `npm run dev -- --host ${devServerHost} --port ${devServerPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
