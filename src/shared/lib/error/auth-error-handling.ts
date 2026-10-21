import { ApiError, NetworkError, UnauthorizedError } from "@/shared/api";
import type { InvitationError } from "@/shared/api/auth";
import { isRecord } from "@/lib/guards/guards";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";

type AuthFlow = "login" | "registration";

const AUTH_ERROR_MESSAGES = {
  loginFailed: "Login failed. Please try again.",
  registrationFailed: "Registration failed. Please check your details and try again.",
  invalidCredentials: "Incorrect email or password.",
  invalidEmailLogin: "Incorrect email address.",
  invalidEmailRegistration: "Please enter a valid email address.",
  invalidPasswordLogin: "Incorrect password.",
  invalidPasswordRegistration: "Password is invalid.",
  passwordTooShort: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  loginRateLimited: "Too many login attempts. Please try again later.",
  registrationRateLimited: "Too many registration attempts. Please try again later.",
  invalidUsername: "Username is invalid.",
  usernameTaken: "Username is already taken.",
  emailTaken: "This email is already registered.",
  // The backend hides which field clashed, so the text names neither (darts-backend#33).
  accountExists: "Email or username is already taken.",
  csrf: "Security token is invalid or expired. Please try again.",
  server: "Server error. Please try again later.",
  network: "Network error. Please check your connection and try again.",
} as const;

const INVITATION_ERROR_MESSAGES: Record<InvitationError, string> = {
  GAME_ALREADY_STARTED: "This game has already started",
  GAME_ROOM_FULL: "This game is full",
  GAME_NOT_FOUND: "This game no longer exists",
  GAME_JOIN_NOT_ALLOWED: "This game can no longer be joined",
};

const TOO_MANY_REQUESTS = 429;
const REGISTRATION_ACCOUNT_EXISTS = "REGISTRATION_ACCOUNT_EXISTS";
// Matches "Your password should be at least 6 characters long." but not rules such as
// "at least one digit".
const PASSWORD_MIN_LENGTH_PATTERN = /password.*at least \d+ characters/;
const SECONDS_PER_MINUTE = 60;

interface ApiErrorPayload {
  error?: unknown;
  message?: unknown;
  errors?: unknown;
}

interface AuthErrorInput {
  flow: AuthFlow;
  error?: unknown;
  rawMessage?: string | null | undefined;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function includesAny(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    ("error" in value && value.error !== undefined) ||
    ("message" in value && value.message !== undefined) ||
    ("errors" in value && value.errors !== undefined)
  );
}

function toApiErrorPayload(error: unknown): ApiErrorPayload | null {
  if (!(error instanceof ApiError) || !isRecord(error.data)) {
    return null;
  }

  return isApiErrorPayload(error.data) ? error.data : null;
}

function collectStringValues(value: unknown): string[] {
  if ("string" === typeof value) {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStringValues);
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap(collectStringValues);
  }

  return [];
}

function mapFieldToMessage(field: string, flow: AuthFlow): string | null {
  const normalizedField = normalizeText(field);

  if (normalizedField.includes("csrf")) {
    return AUTH_ERROR_MESSAGES.csrf;
  }

  if (normalizedField.includes("email")) {
    return "login" === flow
      ? AUTH_ERROR_MESSAGES.invalidEmailLogin
      : AUTH_ERROR_MESSAGES.invalidEmailRegistration;
  }

  if (normalizedField.includes("password")) {
    return "login" === flow
      ? AUTH_ERROR_MESSAGES.invalidPasswordLogin
      : AUTH_ERROR_MESSAGES.invalidPasswordRegistration;
  }

  if (normalizedField.includes("username")) {
    return AUTH_ERROR_MESSAGES.invalidUsername;
  }

  return null;
}

function mapMessageToUserText(message: string, flow: AuthFlow): string | null {
  const normalized = normalizeText(message);

  if (
    includesAny(normalized, [
      "csrf",
      "security token",
      "token invalid",
      "token expired",
      "cross site request forgery",
    ])
  ) {
    return AUTH_ERROR_MESSAGES.csrf;
  }

  if (
    includesAny(normalized, [
      "network request failed",
      "failed to fetch",
      "network error",
      "connection error",
      "request timeout",
      "timeout",
    ])
  ) {
    return AUTH_ERROR_MESSAGES.network;
  }

  if (
    includesAny(normalized, [
      "internal server error",
      "server error",
      "service unavailable",
      "bad gateway",
      "gateway timeout",
    ])
  ) {
    return AUTH_ERROR_MESSAGES.server;
  }

  if (
    includesAny(normalized, [
      "email already",
      "email exists",
      "already registered",
      "duplicate email",
    ])
  ) {
    return AUTH_ERROR_MESSAGES.emailTaken;
  }

  if (
    includesAny(normalized, [
      "username already",
      "username exists",
      "username taken",
      "duplicate username",
    ])
  ) {
    return AUTH_ERROR_MESSAGES.usernameTaken;
  }

  if ("registration" === flow && PASSWORD_MIN_LENGTH_PATTERN.test(normalized)) {
    return AUTH_ERROR_MESSAGES.passwordTooShort;
  }

  if (
    includesAny(normalized, [
      "invalid password",
      "wrong password",
      "incorrect password",
      "passwort",
      "password invalid",
    ])
  ) {
    return "login" === flow
      ? AUTH_ERROR_MESSAGES.invalidPasswordLogin
      : AUTH_ERROR_MESSAGES.invalidPasswordRegistration;
  }

  if (
    includesAny(normalized, [
      "invalid email",
      "email invalid",
      "email not found",
      "unknown email",
      "bad email",
      "wrong email",
    ])
  ) {
    return "login" === flow
      ? AUTH_ERROR_MESSAGES.invalidEmailLogin
      : AUTH_ERROR_MESSAGES.invalidEmailRegistration;
  }

  if (
    includesAny(normalized, [
      "invalid credentials",
      "bad credentials",
      "incorrect credentials",
      "authentication failed",
      "unauthorized",
    ])
  ) {
    return AUTH_ERROR_MESSAGES.invalidCredentials;
  }

  if (includesAny(normalized, ["login failed", "login fehlgeschlagen"])) {
    return AUTH_ERROR_MESSAGES.loginFailed;
  }

  if (includesAny(normalized, ["registration failed"])) {
    return AUTH_ERROR_MESSAGES.registrationFailed;
  }

  return null;
}

function pluralize(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

// Rounds up, so the player does not retry before the limit ends.
function formatWait(seconds: number): string {
  if (seconds < SECONDS_PER_MINUTE) {
    return pluralize(seconds, "second");
  }

  return pluralize(Math.ceil(seconds / SECONDS_PER_MINUTE), "minute");
}

function mapRateLimitMessage(error: ApiError, flow: AuthFlow): string {
  if ("registration" === flow) {
    return AUTH_ERROR_MESSAGES.registrationRateLimited;
  }

  if (error.retryAfterSeconds === undefined) {
    return AUTH_ERROR_MESSAGES.loginRateLimited;
  }

  return `Too many login attempts. Please try again in about ${formatWait(error.retryAfterSeconds)}.`;
}

function mapValidationErrors(payload: ApiErrorPayload, flow: AuthFlow): string[] {
  if (!isRecord(payload.errors)) {
    return [];
  }

  const messages = new Set<string>();

  for (const [field, value] of Object.entries(payload.errors)) {
    const valueMessages = collectStringValues(value);

    if (valueMessages.length === 0) {
      const fallbackByField = mapFieldToMessage(field, flow);
      if (fallbackByField) {
        messages.add(fallbackByField);
      }
      continue;
    }

    for (const candidate of valueMessages) {
      const mappedByMessage = mapMessageToUserText(candidate, flow);
      if (mappedByMessage) {
        messages.add(mappedByMessage);
        continue;
      }

      const mappedByField = mapFieldToMessage(field, flow);
      if (mappedByField) {
        messages.add(mappedByField);
        continue;
      }

      const fallbackByField = mapFieldToMessage(field, flow);
      if (fallbackByField) {
        messages.add(fallbackByField);
      }
    }
  }

  return Array.from(messages);
}

export function isCsrfRelatedAuthError(error: unknown, rawMessage?: string | null): boolean {
  const candidates = [
    rawMessage,
    error instanceof Error ? error.message : null,
    ...collectStringValues(toApiErrorPayload(error)),
  ];

  return candidates.some((candidate) => {
    if (!candidate) {
      return false;
    }

    return AUTH_ERROR_MESSAGES.csrf === mapMessageToUserText(candidate, "login");
  });
}

export function mapAuthErrorMessage({ flow, error, rawMessage }: AuthErrorInput): string {
  const fallbackMessage =
    "login" === flow ? AUTH_ERROR_MESSAGES.loginFailed : AUTH_ERROR_MESSAGES.registrationFailed;

  if (error instanceof NetworkError || (error instanceof ApiError && error.status === 0)) {
    return AUTH_ERROR_MESSAGES.network;
  }

  if (error instanceof ApiError && error.status >= 500) {
    return AUTH_ERROR_MESSAGES.server;
  }

  if (error instanceof ApiError && error.status === TOO_MANY_REQUESTS) {
    return mapRateLimitMessage(error, flow);
  }

  const payload = toApiErrorPayload(error);
  if ("registration" === flow && payload?.error === REGISTRATION_ACCOUNT_EXISTS) {
    return AUTH_ERROR_MESSAGES.accountExists;
  }

  if (payload) {
    const validationMessages = mapValidationErrors(payload, flow);
    if (validationMessages.length > 0) {
      return validationMessages.join("\n");
    }
  }

  const candidates = [
    rawMessage,
    error instanceof Error ? error.message : null,
    payload && "string" === typeof payload.error ? payload.error : null,
    payload && "string" === typeof payload.message ? payload.message : null,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const mappedMessage = mapMessageToUserText(candidate, flow);
    if (mappedMessage) {
      return mappedMessage;
    }
  }

  if (error instanceof UnauthorizedError && "login" === flow) {
    return AUTH_ERROR_MESSAGES.invalidCredentials;
  }

  return fallbackMessage;
}

/**
 * Returns the text for an invitation the backend could not join after a successful login.
 */
export function mapInvitationErrorMessage(invitationError: InvitationError): string {
  return INVITATION_ERROR_MESSAGES[invitationError];
}
