import { ApiError, NetworkError, UnauthorizedError } from "@/lib/api";

export type AuthFlow = "login" | "registration";

const AUTH_ERROR_MESSAGES = {
  loginFailed: "Login failed. Please try again.",
  registrationFailed: "Registration failed. Please check your details and try again.",
  invalidCredentials: "Incorrect email or password.",
  invalidEmailLogin: "Incorrect email address.",
  invalidEmailRegistration: "Please enter a valid email address.",
  invalidPasswordLogin: "Incorrect password.",
  invalidPasswordRegistration: "Password is invalid.",
  invalidUsername: "Username is invalid.",
  usernameTaken: "Username is already taken.",
  emailTaken: "This email is already registered.",
  csrf: "Security token is invalid or expired. Please try again.",
  server: "Server error. Please try again later.",
  network: "Network error. Please check your connection and try again.",
} as const;

type ApiErrorPayload = {
  error?: unknown;
  message?: unknown;
  errors?: unknown;
};

type AuthErrorInput = {
  flow: AuthFlow;
  error?: unknown;
  rawMessage?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function includesAny(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

function toApiErrorPayload(error: unknown): ApiErrorPayload | null {
  if (!(error instanceof ApiError) || !isRecord(error.data)) {
    return null;
  }

  return error.data as ApiErrorPayload;
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

  const payload = toApiErrorPayload(error);
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
