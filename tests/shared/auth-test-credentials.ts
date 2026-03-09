import { test } from "@playwright/test";
import {
  resolvePlaywrightAuthTestCredentials,
  type PlaywrightAuthTestCredentials,
} from "../../src/shared/lib/playwrightAuthCredentials";

const resolvedAuthTestCredentials = resolvePlaywrightAuthTestCredentials();
const shouldSkipAuthDependentTests = !resolvedAuthTestCredentials.isConfigured;
const authTestSkipReason = resolvedAuthTestCredentials.isConfigured
  ? ""
  : resolvedAuthTestCredentials.skipReason;

export function skipWhenAuthCredentialsMissing(): void {
  test.skip(shouldSkipAuthDependentTests, authTestSkipReason);
}

export function getAuthTestCredentials(): PlaywrightAuthTestCredentials {
  if (!resolvedAuthTestCredentials.isConfigured) {
    throw new Error(authTestSkipReason);
  }

  return resolvedAuthTestCredentials.credentials;
}
