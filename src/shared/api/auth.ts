import { apiClient, API_BASE_URL } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoginResponse {
  redirect?: string;
  success?: boolean;
  error?: string | null;
  last_username?: string | null;
  [key: string]: unknown;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationResponse {
  redirect?: string;
  [key: string]: unknown;
}

export interface RegistrationData {
  username: string;
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  success: boolean;
  roles: string[];
  id: number;
  email?: string | null;
  username?: string | null;
  redirect: string;
  gameId?: number | null;
}

export type CsrfTokenPurpose = "authenticate" | "user_registration";

export type CsrfTokenMap = {
  authenticate: string;
  user_registration: string;
};

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------

const CSRF_ENDPOINT = "/csrf";

type CsrfTokensResponse = {
  success: boolean;
  tokens: CsrfTokenMap;
};

let csrfTokensCache: CsrfTokenMap | null = null;
let csrfTokensPromise: Promise<CsrfTokenMap> | null = null;

/**
 * Fetches CSRF tokens, with optional cache bypass.
 */
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

/**
 * Returns a single CSRF token for the requested purpose.
 */
export async function getCsrfToken(purpose: CsrfTokenPurpose, force = false): Promise<string> {
  const tokens = await getCsrfTokens(force);
  const token = tokens[purpose];

  if (!token) {
    throw new Error(`Missing CSRF token for ${purpose}`);
  }

  return token;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const LOGIN_ENDPOINT = "/login";
const LOGOUT_ENDPOINT = "/logout";
const REGISTER_ENDPOINT = "/register";
const AUTH_CHECK_TIMEOUT_MS = 8000;

/**
 * Logs in a user using email/password credentials.
 */
export async function loginWithCredentials(credentials: LoginCredentials): Promise<LoginResponse> {
  const payload = new URLSearchParams();
  payload.set("_username", credentials.email);
  payload.set("_password", credentials.password);

  return apiClient.post<LoginResponse>(LOGIN_ENDPOINT, payload.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    skipAuthRedirect: true,
  });
}

/**
 * Logs out the current user.
 */
export async function logout(): Promise<void> {
  return apiClient.post(LOGOUT_ENDPOINT);
}

/**
 * Registers a new user account.
 * @param refreshCsrf - when true, fetches a fresh CSRF token before posting
 */
export async function registerUser(
  data: RegistrationData,
  refreshCsrf = false,
): Promise<RegistrationResponse> {
  if (refreshCsrf) {
    try {
      await fetch(REGISTER_ENDPOINT, { method: "GET", credentials: "include" });
    } catch {
      // Ignore prefetch errors; proceed with registration attempt
    }
  }

  return apiClient.post<RegistrationResponse>(REGISTER_ENDPOINT, {
    username: data.username,
    email: data.email,
    plainPassword: data.password,
  });
}

/**
 * Fetches the currently authenticated user, if any.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/login/success`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (response.ok) {
    const data = await response.json();
    if (data.success) {
      return data.user ?? data;
    }
  }

  return null;
}
