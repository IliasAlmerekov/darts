import * as v from "valibot";
import { apiClient, ApiValidationError } from "./client";
import { ApiError, UnauthorizedError } from "./errors";
import { integerSchema } from "./schemas";
import { queryClient } from "@/shared/query/queryClient";
import { resetRoomStore } from "@/shared/store/game-session";
import { resetGameStore } from "@/shared/store/game-state";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const roleSchema = v.picklist(["ROLE_USER", "ROLE_ADMIN", "ROLE_PLAYER"]);

/** Why the backend could not join the invitation held in the session. The login still worked. */
const invitationErrorSchema = v.picklist([
  "GAME_ALREADY_STARTED",
  "GAME_ROOM_FULL",
  "GAME_NOT_FOUND",
  "GAME_JOIN_NOT_ALLOWED",
]);

/** Contract response of `GET /api/csrf`. */
const csrfTokensResponseSchema = v.object({
  success: v.boolean(),
  tokens: v.record(v.string(), v.string()),
});

// The contract documents no logout body. The backend answers with a 302 that `logout` does
// not follow, so the body is the opaque redirect's empty text.
const logoutResponseSchema = v.string();

/** `GET /api/login/success`, the shape the contract documents. */
const authenticatedUserSchema = v.object({
  success: v.literal(true),
  roles: v.array(roleSchema),
  id: v.number(),
  email: v.optional(v.nullable(v.string())),
  username: v.optional(v.nullable(v.string())),
  redirect: v.string(),
  gameId: v.optional(v.nullable(v.number())),
  invitationError: v.optional(invitationErrorSchema),
});

/**
 * The rest of the `POST /api/login` contract: every field is optional. The controller
 * fallback answers like this, with `redirect: "/api/login/success"` and no target.
 */
const loginStatusSchema = v.pipe(
  v.object({
    success: v.optional(v.boolean()),
    id: v.optional(v.nullable(integerSchema)),
    email: v.optional(v.nullable(v.string())),
    username: v.optional(v.nullable(v.string())),
    roles: v.optional(v.array(v.string())),
    redirect: v.optional(v.nullable(v.string())),
    gameId: v.optional(integerSchema),
    invitationError: v.optional(invitationErrorSchema),
    last_username: v.optional(v.nullable(v.string())),
    error: v.optional(v.nullable(v.string())),
  }),
  v.check((login) => Object.keys(login).length > 0),
);

/**
 * `POST /api/login`. A successful login answers with the `/api/login/success` body and
 * becomes `user`. Any other answer is a `failure` when it says so, and otherwise means
 * the user is logged in but the body lacks them, so the caller reads the `session`.
 */
const loginResponseSchema = v.union([
  v.pipe(
    authenticatedUserSchema,
    v.transform((user) => ({ type: "user" as const, user })),
  ),
  v.pipe(
    loginStatusSchema,
    v.transform((login) =>
      login.success === false || typeof login.error === "string"
        ? { type: "failure" as const, error: login.error ?? null }
        : { type: "session" as const },
    ),
  ),
]);

/**
 * Contract response of `POST /api/register`, 201. The backend logs the new player in and
 * answers with the `/api/login/success` body.
 */
const registrationResponseSchema = authenticatedUserSchema;

// The backend also answers with a user envelope or `{ success: false }`; the contract
// does not document these yet.
const authCheckResponseSchema = v.union([
  v.object({ success: v.literal(true), user: authenticatedUserSchema }),
  authenticatedUserSchema,
  v.object({ success: v.literal(false) }),
]);

type LoginResponse = v.InferOutput<typeof loginResponseSchema>;
export type RegistrationResponse = v.InferOutput<typeof registrationResponseSchema>;
export type Role = v.InferOutput<typeof roleSchema>;
export type AuthenticatedUser = v.InferOutput<typeof authenticatedUserSchema>;
export type InvitationError = v.InferOutput<typeof invitationErrorSchema>;

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegistrationData {
  username: string;
  email: string;
  password: string;
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

/**
 * Logs in a user using email/password credentials.
 */
export async function loginWithCredentials(credentials: LoginCredentials): Promise<LoginResponse> {
  const payload = new URLSearchParams();
  payload.set("_username", credentials.email);
  payload.set("_password", credentials.password);

  return apiClient.post(LOGIN_ENDPOINT, payload.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    skipAuthRedirect: true,
    validate: loginResponseSchema,
  });
}

/**
 * Drops everything the client holds for the current session: cached reads, the room
 * store with its stored game id, and the game store. Logout and the 401 handler share it.
 */
export function clearClientSession(): void {
  queryClient.clear();
  resetRoomStore();
  resetGameStore();
}

/**
 * Logs out the current user, then clears the client session. A failed request throws
 * before anything is cleared, because the remember-me cookie would still be valid.
 */
export async function logout(onSuccess?: () => void): Promise<void> {
  // The 302 points at the backend's own origin. Following it from the app's origin fails
  // CORS after the cookies are already gone, and a retry would hit the same wall.
  await apiClient.post(LOGOUT_ENDPOINT, undefined, {
    redirect: "manual",
    validate: logoutResponseSchema,
  });
  clearClientSession();
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
        validate: csrfTokensResponseSchema,
      });
    } catch (error) {
      const { clientLogger } = await import("@/shared/services/browser/clientLogger");
      clientLogger.warn("auth.csrf_prefetch.failed", { error });
    }
  }

  return apiClient.post(
    REGISTER_ENDPOINT,
    {
      username: data.username,
      email: data.email,
      plainPassword: data.password,
    },
    {
      validate: registrationResponseSchema,
    },
  );
}

/**
 * Fetches the currently authenticated user, if any.
 */
export async function getAuthenticatedUser(
  options: GetAuthenticatedUserOptions = {},
): Promise<AuthenticatedUser | null> {
  const timeoutMs = options.timeoutMs ?? AUTH_CHECK_TIMEOUT_MS;

  try {
    const response = await apiClient.get("/login/success", {
      signal: options.signal,
      skipAuthRedirect: true,
      timeoutMs,
      validate: authCheckResponseSchema,
    });

    if ("user" in response) {
      return response.user;
    }

    if ("roles" in response) {
      return response;
    }

    throw new ApiError("Authorization failed for authenticated user", {
      status: 401,
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
