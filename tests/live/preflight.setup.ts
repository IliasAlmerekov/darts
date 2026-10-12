import { test as setup } from "@playwright/test";
import {
  findMissingLivePrerequisites,
  LIVE_BACKEND_HEALTH_PATH,
  type LiveBackendHealth,
} from "../../src/test/playwright/playwrightLivePrerequisites";

setup("live prerequisites are available", async ({ request }) => {
  let health: LiveBackendHealth;

  try {
    const response = await request.get(LIVE_BACKEND_HEALTH_PATH);
    health = response.ok() ? { ok: true } : { ok: false, reason: `HTTP ${response.status()}` };
  } catch (error) {
    health = {
      ok: false,
      reason:
        error instanceof Error ? (error.message.split("\n")[0] ?? error.message) : String(error),
    };
  }

  const problems = findMissingLivePrerequisites(process.env, health);

  if (problems.length > 0) {
    throw new Error(`Live Playwright suite cannot run:\n- ${problems.join("\n- ")}`);
  }
});
