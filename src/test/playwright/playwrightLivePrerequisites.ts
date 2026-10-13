import { resolvePlaywrightAuthTestCredentials } from "./playwrightAuthCredentials";

type PlaywrightLiveTestEnv = Readonly<Record<string, string | undefined>>;

export type LiveBackendHealth = { ok: true } | { ok: false; reason: string };

export const LIVE_BACKEND_HEALTH_PATH = "/api/health";

/** Returns one message per missing live-suite prerequisite; an empty list means ready. */
export function findMissingLivePrerequisites(
  env: PlaywrightLiveTestEnv,
  health: LiveBackendHealth,
): string[] {
  const problems: string[] = [];
  const credentials = resolvePlaywrightAuthTestCredentials(env);

  if (!credentials.isConfigured) {
    problems.push(credentials.missingReason);
  }

  if (!health.ok) {
    problems.push(
      `Backend healthcheck GET ${LIVE_BACKEND_HEALTH_PATH} failed (${health.reason}). Start the backend or set VITE_API_TARGET to a running one.`,
    );
  }

  return problems;
}
