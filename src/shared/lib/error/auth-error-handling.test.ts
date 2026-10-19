// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ApiError, NetworkError, UnauthorizedError } from "@/shared/api";
import {
  isCsrfRelatedAuthError,
  mapAuthErrorMessage,
  mapInvitationErrorMessage,
} from "./auth-error-handling";

describe("mapAuthErrorMessage", () => {
  it("should map invalid password message when login password is incorrect", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      rawMessage: "Invalid password",
    });

    expect(result).toBe("Incorrect password.");
  });

  it("should map invalid email message when login email is incorrect", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      rawMessage: "Invalid email",
    });

    expect(result).toBe("Incorrect email address.");
  });

  it("should map server error message when login request fails with server error", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: new ApiError("Internal Server Error", {
        status: 500,
      }),
    });

    expect(result).toBe("Server error. Please try again later.");
  });

  it("should map network error message when registration request fails without connection", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: new NetworkError(),
    });

    expect(result).toBe("Network error. Please check your connection and try again.");
  });

  it("should map validation payload fields when registration returns field errors", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: new ApiError("Validation failed", {
        status: 422,
        data: {
          errors: {
            email: ["This value is not valid."],
            plainPassword: ["This value is too short."],
          },
        },
      }),
    });

    expect(result).toBe("Please enter a valid email address.\nPassword is invalid.");
  });

  it("should map username conflict message when registration returns existing username error", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: new ApiError("Conflict", {
        status: 409,
        data: {
          errors: {
            username: ["Username already exists"],
          },
        },
      }),
    });

    expect(result).toBe("Username is already taken.");
  });

  it("should map credentials error message when login request is unauthorized", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: new UnauthorizedError(),
    });

    expect(result).toBe("Incorrect email or password.");
  });
});

describe("mapAuthErrorMessage password minimum", () => {
  it("shows the 8-character minimum when registration rejects a short password", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: new ApiError("Validation failed", {
        status: 400,
        data: {
          errors: { plainPassword: "Your password should be at least 8 characters long." },
        },
      }),
    });

    expect(result).toBe("Password must be at least 8 characters.");
  });

  it("keeps the generic text for other registration password errors", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: new ApiError("Validation failed", {
        status: 400,
        data: { errors: { plainPassword: "This value should not be blank." } },
      }),
    });

    expect(result).toBe("Password is invalid.");
  });
});

describe("mapAuthErrorMessage rate limits", () => {
  function tooManyRequests(data: unknown, retryAfterSeconds?: number): ApiError {
    return new ApiError("Too many requests", { status: 429, data, retryAfterSeconds });
  }

  it("tells the player to try again later when registration is rate-limited", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: tooManyRequests(
        { success: false, error: "REGISTRATION_RATE_LIMITED", message: "Too many attempts." },
        3600,
      ),
    });

    expect(result).toBe("Too many registration attempts. Please try again later.");
  });

  it.each([
    [60, "Too many login attempts. Please try again in about 1 minute."],
    [120, "Too many login attempts. Please try again in about 2 minutes."],
    [90, "Too many login attempts. Please try again in about 2 minutes."],
    [30, "Too many login attempts. Please try again in about 30 seconds."],
    [1, "Too many login attempts. Please try again in about 1 second."],
  ])("names the wait when login is rate-limited with Retry-After %i", (seconds, expected) => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: tooManyRequests(
        {
          error: "Too many failed login attempts, please try again in 1 minute.",
          status: 429,
        },
        seconds,
      ),
    });

    expect(result).toBe(expected);
  });

  it("omits the wait when login is rate-limited without Retry-After", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: tooManyRequests({
        error: "Too many failed login attempts, please try again in 1 minute.",
        status: 429,
      }),
    });

    expect(result).toBe("Too many login attempts. Please try again later.");
  });
});

describe("isCsrfRelatedAuthError", () => {
  it("should detect csrf-related auth error when login raw message contains csrf token failure", () => {
    expect(isCsrfRelatedAuthError(undefined, "Invalid CSRF token")).toBe(true);
  });

  it("should detect csrf-related auth error when api payload contains csrf token validation error", () => {
    const error = new ApiError("Validation failed", {
      status: 422,
      data: {
        errors: {
          _csrf_token: ["The CSRF token is invalid."],
        },
      },
    });

    expect(isCsrfRelatedAuthError(error)).toBe(true);
  });
});

describe("mapInvitationErrorMessage", () => {
  it.each([
    ["GAME_ALREADY_STARTED", "This game has already started"],
    ["GAME_ROOM_FULL", "This game is full"],
    ["GAME_NOT_FOUND", "This game no longer exists"],
    ["GAME_JOIN_NOT_ALLOWED", "This game can no longer be joined"],
  ] as const)("maps %s to %s", (code, message) => {
    expect(mapInvitationErrorMessage(code)).toBe(message);
  });
});
