import { apiClient, API_BASE_URL } from "./client";
import { ApiError, TimeoutError } from "./errors";

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

interface CsrfTokensResponse {
  success: boolean;
  tokens: Record<string, string>;
}

export type Role = "ROLE_USER" | "ROLE_ADMIN" | "ROLE_PLAYER";
export type UserRole = Role;

export interface AuthenticatedUser {
  success: boolean;
  roles: Role[];
  id: number;
  email?: string | null;
  username?: string | null;
  redirect: string;
  gameId?: number | null;
}

const LOGIN_ENDPOINT = "/login";
const LOGOUT_ENDPOINT = "/logout";
const REGISTER_ENDPOINT = "/register";
const CSRF_ENDPOINT = "/csrf";
const AUTH_CHECK_TIMEOUT_MS = 8000;

type GetAuthenticatedUserOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

const VALID_ROLES: ReadonlySet<string> = new Set(["ROLE_USER", "ROLE_ADMIN", "ROLE_PLAYER"]);

export function isRoleArray(value: unknown): value is UserRole[] {
  return Array.isArray(value) && value.every((r) => VALID_ROLES.has(r));
}

function isLoginResponse(data: unknown): data is LoginResponse {
  if (!isRecord(data)) {
    return false;
  }

  const hasKnownField =
    "redirect" in data || "success" in data || "error" in data || "last_username" in data;

  return (
    hasKnownField &&
    (data.redirect === undefined || typeof data.redirect === "string") &&
    (data.success === undefined || typeof data.success === "boolean") &&
    (data.error === undefined || isNullableString(data.error)) &&
    (data.last_username === undefined || isNullableString(data.last_username))
  );
}

function isRegistrationResponse(data: unknown): data is RegistrationResponse {
  return isRecord(data) && (data.redirect === undefined || typeof data.redirect === "string");
}

function isCsrfTokensResponse(data: unknown): data is CsrfTokensResponse {
  if (!isRecord(data) || data.success !== true || !isRecord(data.tokens)) {
    return false;
  }

  return Object.values(data.tokens).every((token) => typeof token === "string");
}

function isLogoutResponse(data: unknown): data is string {
  return typeof data === "string";
}

function isAuthenticatedUser(data: unknown): data is AuthenticatedUser {
  return (
    isRecord(data) &&
    data.success === true &&
    isRoleArray(data.roles) &&
    isFiniteNumber(data.id) &&
    typeof data.redirect === "string" &&
    (data.email === undefined || isNullableString(data.email)) &&
    (data.username === undefined || isNullableString(data.username)) &&
    (data.gameId === undefined || data.gameId === null || isFiniteNumber(data.gameId))
  );
}

function isAuthenticatedUserEnvelope(
  data: unknown,
): data is { success: true; user: AuthenticatedUser } {
  return isRecord(data) && data.success === true && isAuthenticatedUser(data.user);
}

function isUnauthenticatedAuthResponse(data: unknown): boolean {
  return isRecord(data) && data.success === false;
}

/**
 * Logs in a user using email/password credentials.
 */
export async function loginWithCredentials(credentials: LoginCredentials): Promise<LoginResponse> {
  const payload = new URLSearchParams();
  payload.set("_username", credentials.email);
  payload.set("_password", credentials.password);

  const response: unknown = await apiClient.post(LOGIN_ENDPOINT, payload.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    skipAuthRedirect: true,
    validate: isLoginResponse,
  });

  if (!isLoginResponse(response)) {
    throw new ApiError("Unexpected response shape for login", { status: 200, data: response });
  }

  return response;
}

/**
 * Logs out the current user.
 */
export async function logout(onSuccess?: () => void): Promise<void> {
  await apiClient.post(LOGOUT_ENDPOINT, undefined, {
    validate: isLogoutResponse,
  });
  onSuccess?.();
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
      await apiClient.get(CSRF_ENDPOINT, {
        skipAuthRedirect: true,
        validate: isCsrfTokensResponse,
      });
    } catch {
      // Ignore prefetch errors; proceed with registration attempt
    }
  }

  const response: unknown = await apiClient.post(
    REGISTER_ENDPOINT,
    {
      username: data.username,
      email: data.email,
      plainPassword: data.password,
    },
    {
      validate: isRegistrationResponse,
    },
  );

  if (!isRegistrationResponse(response)) {
    throw new ApiError("Unexpected response shape for registration", {
      status: 200,
      data: response,
    });
  }

  return response;
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

    if (isAuthenticatedUserEnvelope(data)) {
      return data.user;
    }

    if (isAuthenticatedUser(data)) {
      return data;
    }

    if (isUnauthenticatedAuthResponse(data)) {
      return null;
    }

    throw new ApiError("Unexpected response shape for authenticated user", {
      status: response.status,
      data,
      url: response.url,
    });
  }

  return null;
}
