import { apiClient } from "@/lib/api";

const CSRF_ENDPOINT = "/csrf";

export type CsrfTokenPurpose = "authenticate" | "user_registration";

export type CsrfTokenMap = {
  authenticate: string;
  user_registration: string;
};

type CsrfTokensResponse = {
  success: boolean;
  tokens: CsrfTokenMap;
};

let csrfTokensCache: CsrfTokenMap | null = null;
let csrfTokensPromise: Promise<CsrfTokenMap> | null = null;

export async function getCsrfTokens(force = false): Promise<CsrfTokenMap> {
  if (!force && csrfTokensCache) {
    return csrfTokensCache;
  }

  if (!force && csrfTokensPromise) {
    return csrfTokensPromise;
  }

  csrfTokensPromise = apiClient
    .get<CsrfTokensResponse>(CSRF_ENDPOINT, { skipAuthRedirect: true })
    .then((response) => {
      if (!response?.tokens?.authenticate || !response?.tokens?.user_registration) {
        throw new Error("CSRF token response is missing required tokens");
      }

      csrfTokensCache = response.tokens;
      return response.tokens;
    })
    .finally(() => {
      csrfTokensPromise = null;
    });

  return csrfTokensPromise;
}

export async function getCsrfToken(purpose: CsrfTokenPurpose, force = false): Promise<string> {
  const tokens = await getCsrfTokens(force);
  const token = tokens[purpose];

  if (!token) {
    throw new Error(`Missing CSRF token for ${purpose}`);
  }

  return token;
}
