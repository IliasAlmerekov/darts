import { apiClient, API_BASE_URL } from "./client";
import { TimeoutError } from "./errors";
import { invalidateAuthState } from "@/store/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoginResponse {
  redirect?: string;
  success?: boolean;
  error?: string | null;
  last_username?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationResponse {
  redirect?: string;
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

const LOGIN_ENDPOINT = "/login";
const LOGOUT_ENDPOINT = "/logout";
const REGISTER_ENDPOINT = "/register";
const AUTH_CHECK_TIMEOUT_MS = 8000;

type GetAuthenticatedUserOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

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
  await apiClient.post(LOGOUT_ENDPOINT);
  invalidateAuthState();
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
      await apiClient.get(REGISTER_ENDPOINT, { skipAuthRedirect: true });
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
export async function getAuthenticatedUser(
  options: GetAuthenticatedUserOptions = {},
): Promise<AuthenticatedUser | null> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? AUTH_CHECK_TIMEOUT_MS;
  const forwardAbort = (): void => {
    controller.abort(options.signal?.reason);
  };

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      options.signal.addEventListener("abort", forwardAbort, { once: true });
    }
  }

  const timeoutId = window.setTimeout(() => controller.abort("timeout"), timeoutMs);

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
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (controller.signal.reason === "timeout") {
        throw new TimeoutError(
          `Request timed out after ${timeoutMs}ms`,
          `${API_BASE_URL}/login/success`,
        );
      }
    }

    throw error;
  } finally {
    options.signal?.removeEventListener("abort", forwardAbort);
    window.clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    return null;
  }

  if (response.ok) {
    const data: unknown = await response.json().catch(() => null);

    if (
      typeof data === "object" &&
      data !== null &&
      "success" in data &&
      (data as Record<string, unknown>).success === true
    ) {
      const record = data as Record<string, unknown>;
      const user = (record.user ?? data) as AuthenticatedUser;
      if (typeof user.id !== "number" || !Array.isArray(user.roles)) {
        return null;
      }
      return user;
    }
  }

  return null;
}
