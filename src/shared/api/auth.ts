import * as v from "valibot";
import { apiClient, ApiValidationError } from "./client";
import { ApiError, UnauthorizedError } from "./errors";
import { integerSchema } from "./schemas";
import { clientLogger } from "@/shared/services/browser/clientLogger";

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

/** `POST /api/logout`: a 204 without a body, which `apiClient` reads as `null`. */
const logoutResponseSchema = v.null();

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
  }),
  // With every field optional, this check is what keeps an empty body from passing as
  // a session in loginResponseSchema.
  v.check((login) => Object.keys(login).length > 0),
);

/**
 * `POST /api/login`. A successful login answers with the `/api/login/success` body and
 * becomes `user`. Any other 200 means the user is logged in but the body lacks them, so
 * `loginWithCredentials` reads the `session`. A failed login is a 401 `LOGIN_INVALID_CREDENTIALS`.
 */
const loginResponseSchema = v.union([
  v.pipe(
    authenticatedUserSchema,
    v.transform((user) => ({ type: "user" as const, user })),
  ),
  v.pipe(
    loginStatusSchema,
    v.transform(() => ({ type: "session" as const })),
  ),
]);

/**
 * Contract response of `POST /api/register`, 201. The backend logs the new player in and
 * answers with the `/api/login/success` body.
 */
const registrationResponseSchema = authenticatedUserSchema;

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
const AUTH_CHECK_TIMEOUT_MS = 8000;

// A user whose redirect points into the API came from the controller fallback; the
// target comes from `/api/login/success`.
const API_REDIRECT_PREFIX = "/api/";

interface GetAuthenticatedUserOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** The backend accepted the login, but `/api/login/success` finds no session user. */
class LoginSessionMissingError extends Error {
  constructor() {
    super("Login accepted, but the session holds no user");
    this.name = "LoginSessionMissingError";
  }
}

/**
 * Logs in a user using email/password credentials and resolves with the logged-in user.
 * When the login answer lacks the user, or a request fails with anything but a 401, the
 * user comes from the session. Without a session user it rejects: with
 * `LoginSessionMissingError` after an accepted login, else with the original error.
 */
export async function loginWithCredentials(
  credentials: LoginCredentials,
): Promise<AuthenticatedUser> {
  try {
    const response = await postLogin(credentials);
    if (response.type === "user" && !response.user.redirect.startsWith(API_REDIRECT_PREFIX)) {
      return response.user;
    }

    const sessionUser = await getAuthenticatedUser();
    if (sessionUser === null) {
      throw new LoginSessionMissingError();
    }
    return sessionUser;
  } catch (error) {
    if (error instanceof LoginSessionMissingError) {
      throw error;
    }

    clientLogger.error("auth.login.failed", {
      error,
    });
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }

    let sessionUser: AuthenticatedUser | null = null;
    try {
      sessionUser = await getAuthenticatedUser();
    } catch (sessionCheckError) {
      clientLogger.error("auth.login.session-check-after-error.failed", {
        error: sessionCheckError,
      });
    }
    if (sessionUser === null) {
      throw error;
    }
    return sessionUser;
  }
}

async function postLogin(credentials: LoginCredentials): Promise<LoginResponse> {
  const payload = new URLSearchParams();
  payload.set("_username", credentials.email);
  payload.set("_password", credentials.password);
  // Without this field the backend answers 403 CROSS_ORIGIN_REQUEST. The value is fixed:
  // the backend checks the origin through `Sec-Fetch-Site` / `Origin`.
  payload.set("_csrf_token", "csrf-token");

  return apiClient.post(LOGIN_ENDPOINT, payload.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    skipAuthRedirect: true,
    validate: loginResponseSchema,
  });
}

/**
 * Logs out the current user. It throws on a failed request, so the caller clears the
 * client session only after a logout the backend accepted.
 */
export async function logout(onSuccess?: () => void): Promise<void> {
  await apiClient.post(LOGOUT_ENDPOINT, undefined, { validate: logoutResponseSchema });
  onSuccess?.();
}

/**
 * Registers a new user account.
 */
export async function registerUser(data: RegistrationData): Promise<RegistrationResponse> {
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
    return await apiClient.get("/login/success", {
      signal: options.signal,
      skipAuthRedirect: true,
      timeoutMs,
      validate: authenticatedUserSchema,
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
