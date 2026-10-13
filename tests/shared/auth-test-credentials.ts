import {
  resolvePlaywrightAuthTestCredentials,
  type PlaywrightAuthTestCredentials,
} from "../../src/test/playwright/playwrightAuthCredentials";

/** Live suite only: the live preflight has already failed the run when these are missing. */
export function getAuthTestCredentials(): PlaywrightAuthTestCredentials {
  const resolved = resolvePlaywrightAuthTestCredentials();

  if (!resolved.isConfigured) {
    throw new Error(resolved.missingReason);
  }

  return resolved.credentials;
}
