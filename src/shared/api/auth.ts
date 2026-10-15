import * as v from "valibot";
import { apiClient, ApiValidationError } from "./client";
import { ApiError, UnauthorizedError } from "./errors";
import { integerSchema } from "./schemas";
import { queryClient } from "@/shared/query/queryClient";
import { ROUTES } from "@/shared/lib/router/routes";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

// Login behaviour is out of scope for #158, so the login and auth-check schemas keep the
// rules of the old guards. The PR for #158 lists where they differ from the contract.

const roleSchema = v.picklist(["ROLE_USER", "ROLE_ADMIN", "ROLE_PLAYER"]);

/** `POST /api/login`. At least one of the known fields must be present. */
const loginResponseSchema = v.pipe(
  v.object({
    redirect: v.optional(v.string()),
    success: v.optional(v.boolean()),
    error: v.optional(v.nullable(v.string())),
    last_username: v.optional(v.nullable(v.string())),
  }),
  v.check((login) => Object.keys(login).length > 0),
);

/** Contract response of `POST /api/register`, 201. */
const registrationResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
  redirect: v.optional(v.nullable(v.string())),
  status: integerSchema,
});

/** Contract response of `GET /api/csrf`. */
const csrfTokensResponseSchema = v.object({
  success: v.boolean(),
  tokens: v.record(v.string(), v.string()),
});

// The contract documents no logout body; the backend answers with its redirect page as text.
const logoutResponseSchema = v.string();

const authenticatedUserProfileSchema = v.object({
  id: v.number(),
  nickname: v.string(),
  stats: v.object({
    gamesPlayed: v.number(),
    scoreAverage: v.number(),
  }),
});

/** `GET /api/login/success`, the shape the contract documents. */
const authenticatedUserSchema = v.object({
  success: v.literal(true),
  roles: v.array(roleSchema),
  id: v.number(),
  email: v.optional(v.nullable(v.string())),
  username: v.optional(v.nullable(v.string())),
  redirect: v.string(),
  gameId: v.optional(v.nullable(v.number())),
  profile: v.optional(authenticatedUserProfileSchema),
});

// The backend also answers with a user envelope, a player profile envelope, or
// `{ success: false }`; the contract does not document these yet.
const authCheckResponseSchema = v.union([
  v.object({ success: v.literal(true), user: authenticatedUserSchema }),
  authenticatedUserSchema,
  v.object({ success: v.literal(true), profile: authenticatedUserProfileSchema }),
  v.object({ success: v.literal(false) }),
]);

type LoginResponse = v.InferOutput<typeof loginResponseSchema>;
export type RegistrationResponse = v.InferOutput<typeof registrationResponseSchema>;
export type Role = v.InferOutput<typeof roleSchema>;
type AuthenticatedUserProfile = v.InferOutput<typeof authenticatedUserProfileSchema>;
export type AuthenticatedUser = v.InferOutput<typeof authenticatedUserSchema>;

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

function normalizeProfileEnvelope(response: {
  profile: AuthenticatedUserProfile;
}): AuthenticatedUser {
  return {
    success: true,
    roles: ["ROLE_PLAYER"],
    id: response.profile.id,
    username: response.profile.nickname,
    redirect: ROUTES.playerProfile,
    profile: response.profile,
  };
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
 * Logs out the current user and drops every cached read of the old session.
 */
export async function logout(onSuccess?: () => void): Promise<void> {
  await apiClient.post(LOGOUT_ENDPOINT, undefined, {
    validate: logoutResponseSchema,
  });
  queryClient.clear();
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
      clientLogger.warn("[auth] CSRF prefetch failed — proceeding with registration", { error });
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

    if ("profile" in response) {
      return normalizeProfileEnvelope(response);
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
