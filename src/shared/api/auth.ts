import { apiClient, ApiValidationError } from "./client";
import { ApiError, UnauthorizedError } from "./errors";
import { isFiniteNumber, isRecord } from "@/lib/guards/guards";

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

interface GetAuthenticatedUserOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

const VALID_ROLES: ReadonlySet<string> = new Set(["ROLE_USER", "ROLE_ADMIN", "ROLE_PLAYER"]);

export function isRoleArray(value: unknown): value is Role[] {
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
    } catch (error) {
      const { clientLogger } = await import("@/shared/services/browser/clientLogger");
      clientLogger.warn("[auth] CSRF prefetch failed — proceeding with registration", { error });
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
  const timeoutMs = options.timeoutMs ?? AUTH_CHECK_TIMEOUT_MS;
  const isAuthenticatedUserResponse = (
    data: unknown,
  ): data is AuthenticatedUser | { success: true; user: AuthenticatedUser } | { success: false } =>
    isAuthenticatedUserEnvelope(data) ||
    isAuthenticatedUser(data) ||
    isUnauthenticatedAuthResponse(data);

  try {
    const response: unknown = await apiClient.get("/login/success", {
      signal: options.signal,
      skipAuthRedirect: true,
      timeoutMs,
      validate: isAuthenticatedUserResponse,
    });

    if (isAuthenticatedUserEnvelope(response)) {
      return response.user;
    }

    if (isAuthenticatedUser(response)) {
      return response;
    }

    if (isUnauthenticatedAuthResponse(response)) {
      return null;
    }

    throw new ApiError("Unexpected response shape for authenticated user", {
      status: 200,
      data: response,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return null;
    }

    if (error instanceof ApiValidationError) {
      throw new ApiError("Unexpected response shape for authenticated user", {
        status: 200,
        data: error.raw,
      });
    }

    throw error;
  }
}
