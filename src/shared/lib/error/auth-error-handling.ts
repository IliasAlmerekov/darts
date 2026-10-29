import { ApiError, NetworkError } from "@/shared/api";
import { isRecord } from "@/lib/guards/guards";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { REGISTRATION_EMAIL_DOMAIN } from "@/lib/auth/email";

type AuthFlow = "login" | "registration";

const AUTH_ERROR_MESSAGES = {
  loginFailed: "Login failed. Please try again.",
  registrationFailed: "Registration failed. Please check your details and try again.",
  invalidCredentials: "Incorrect email or password.",
  emailRequired: "Please enter an email address.",
  invalidEmail: "Please enter a valid email address.",
  emailDomain: `Only ${REGISTRATION_EMAIL_DOMAIN} email addresses can register.`,
  passwordRequired: "Please enter a password.",
  invalidPassword: "Password is invalid.",
  passwordTooShort: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  usernameRequired: "Please enter a username.",
  usernameLength: "Username must be 3 to 30 characters.",
  invalidUsername: "Username is invalid.",
  loginRateLimited: "Too many login attempts. Please try again later.",
  registrationRateLimited: "Too many registration attempts. Please try again later.",
  // The backend hides which field clashed, so the text names neither (darts-backend#33).
  accountExists: "Email or username is already taken.",
  // The backend sends this code for a cross-origin request and for a form without
  // `_csrf_token`, so the text blames neither.
  requestBlocked: "Your request was blocked. Please reload the page and try again.",
  server: "Server error. Please try again later.",
  network: "Network error. Please check your connection and try again.",
} as const;

/** UI text per registration field, by violation code; `default` covers any other code. */
const VIOLATION_MESSAGES: Record<string, Record<string, string> & { default: string }> = {
  email: {
    REQUIRED: AUTH_ERROR_MESSAGES.emailRequired,
    INVALID_EMAIL: AUTH_ERROR_MESSAGES.invalidEmail,
    EMAIL_DOMAIN_NOT_ALLOWED: AUTH_ERROR_MESSAGES.emailDomain,
    default: AUTH_ERROR_MESSAGES.invalidEmail,
  },
  username: {
    REQUIRED: AUTH_ERROR_MESSAGES.usernameRequired,
    TOO_SHORT: AUTH_ERROR_MESSAGES.usernameLength,
    TOO_LONG: AUTH_ERROR_MESSAGES.usernameLength,
    default: AUTH_ERROR_MESSAGES.invalidUsername,
  },
  plainPassword: {
    REQUIRED: AUTH_ERROR_MESSAGES.passwordRequired,
    TOO_SHORT: AUTH_ERROR_MESSAGES.passwordTooShort,
    default: AUTH_ERROR_MESSAGES.invalidPassword,
  },
};

const SECONDS_PER_MINUTE = 60;

interface AuthErrorInput {
  flow: AuthFlow;
  error?: unknown;
}

interface Violation {
  field: string;
  code: string;
}

function isViolation(value: unknown): value is Violation {
  return isRecord(value) && typeof value.field === "string" && typeof value.code === "string";
}

function readErrorCode(error: ApiError): string | null {
  return isRecord(error.data) && typeof error.data.error === "string" ? error.data.error : null;
}

function readViolations(error: ApiError): Violation[] {
  if (!isRecord(error.data) || !Array.isArray(error.data.violations)) {
    return [];
  }

  return error.data.violations.filter(isViolation);
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

function mapLoginRateLimitMessage(error: ApiError): string {
  if (error.retryAfterSeconds === undefined) {
    return AUTH_ERROR_MESSAGES.loginRateLimited;
  }

  return `Too many login attempts. Please try again in about ${formatWait(error.retryAfterSeconds)}.`;
}

// The backend's `message` is for developers; the text comes from field and code only.
function mapViolations(violations: Violation[]): string[] {
  const messages = new Set<string>();

  for (const { field, code } of violations) {
    const fieldMessages = VIOLATION_MESSAGES[field];
    if (fieldMessages) {
      messages.add(fieldMessages[code] ?? fieldMessages.default);
    }
  }

  return Array.from(messages);
}

function mapErrorCode(error: ApiError): string | null {
  switch (readErrorCode(error)) {
    case "LOGIN_INVALID_CREDENTIALS":
      return AUTH_ERROR_MESSAGES.invalidCredentials;
    case "LOGIN_RATE_LIMITED":
      return mapLoginRateLimitMessage(error);
    case "REGISTRATION_RATE_LIMITED":
      return AUTH_ERROR_MESSAGES.registrationRateLimited;
    case "REGISTRATION_ACCOUNT_EXISTS":
      return AUTH_ERROR_MESSAGES.accountExists;
    case "CROSS_ORIGIN_REQUEST":
      return AUTH_ERROR_MESSAGES.requestBlocked;
    case "REQUEST_VALIDATION_FAILED":
      return mapViolations(readViolations(error)).join("\n") || null;
    default:
      return null;
  }
}

export function mapAuthErrorMessage({ flow, error }: AuthErrorInput): string {
  if (error instanceof NetworkError || (error instanceof ApiError && error.status === 0)) {
    return AUTH_ERROR_MESSAGES.network;
  }

  if (error instanceof ApiError && error.status >= 500) {
    return AUTH_ERROR_MESSAGES.server;
  }

  const mappedMessage = error instanceof ApiError ? mapErrorCode(error) : null;
  if (mappedMessage) {
    return mappedMessage;
  }

  return "login" === flow
    ? AUTH_ERROR_MESSAGES.loginFailed
    : AUTH_ERROR_MESSAGES.registrationFailed;
}
