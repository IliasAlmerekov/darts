// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ApiError, ForbiddenError, NetworkError, UnauthorizedError } from "@/shared/api";
import { mapAuthErrorMessage } from "./auth-error-handling";

function backendError(status: number, error: string, retryAfterSeconds?: number): ApiError {
  return new ApiError(error, {
    status,
    data: { success: false, error, message: "Developer text." },
    retryAfterSeconds,
  });
}

describe("mapAuthErrorMessage", () => {
  it("shows the server error when the request fails with a 5xx", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: new ApiError("Internal Server Error", { status: 500 }),
    });

    expect(result).toBe("Server error. Please try again later.");
  });

  it("shows the network error when the request gets no response", () => {
    const result = mapAuthErrorMessage({ flow: "registration", error: new NetworkError() });

    expect(result).toBe("Network error. Please check your connection and try again.");
  });

  it("shows one credentials message for LOGIN_INVALID_CREDENTIALS", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: new UnauthorizedError("Unauthorized", {
        success: false,
        error: "LOGIN_INVALID_CREDENTIALS",
        message: "Invalid credentials.",
      }),
    });

    expect(result).toBe("Incorrect email or password.");
  });

  it("falls back to the flow text for an unknown code", () => {
    expect(mapAuthErrorMessage({ flow: "login", error: backendError(400, "SOMETHING_NEW") })).toBe(
      "Login failed. Please try again.",
    );
    expect(
      mapAuthErrorMessage({ flow: "registration", error: backendError(400, "SOMETHING_NEW") }),
    ).toBe("Registration failed. Please check your details and try again.");
  });

  it("never shows the backend message", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: new ApiError("Incorrect password", {
        status: 400,
        data: { success: false, error: "Incorrect password", message: "Incorrect password" },
      }),
    });

    expect(result).toBe("Login failed. Please try again.");
  });

  it("asks to reload the page for a 403 CROSS_ORIGIN_REQUEST", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: new ForbiddenError("Forbidden", {
        success: false,
        error: "CROSS_ORIGIN_REQUEST",
        message: "Cross-origin request.",
      }),
    });

    expect(result).toBe("Your request was blocked. Please reload the page and try again.");
  });

  it("says the email or username is taken for REGISTRATION_ACCOUNT_EXISTS", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: backendError(409, "REGISTRATION_ACCOUNT_EXISTS"),
    });

    expect(result).toBe("Email or username is already taken.");
  });
});

describe("mapAuthErrorMessage violations", () => {
  function validationFailed(violations: { field: string; code: string }[]): ApiError {
    return new ApiError("REQUEST_VALIDATION_FAILED", {
      status: 422,
      data: {
        success: false,
        error: "REQUEST_VALIDATION_FAILED",
        message: "The request body failed validation.",
        violations: violations.map((violation) => ({ ...violation, message: "Developer text." })),
      },
    });
  }

  it.each([
    ["email", "REQUIRED", "Please enter an email address."],
    ["email", "INVALID_EMAIL", "Please enter a valid email address."],
    ["email", "EMAIL_DOMAIN_NOT_ALLOWED", "Only @db-n.com email addresses can register."],
    ["email", "INVALID_TYPE", "Please enter a valid email address."],
    ["username", "REQUIRED", "Please enter a username."],
    ["username", "TOO_SHORT", "Username must be 3 to 30 characters."],
    ["username", "TOO_LONG", "Username must be 3 to 30 characters."],
    ["username", "INVALID_TYPE", "Username is invalid."],
    ["plainPassword", "REQUIRED", "Please enter a password."],
    ["plainPassword", "TOO_SHORT", "Password must be at least 6 characters."],
    ["plainPassword", "TOO_LONG", "Password is invalid."],
  ])("maps %s + %s to its text", (field, code, expected) => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: validationFailed([{ field, code }]),
    });

    expect(result).toBe(expected);
  });

  it("lists one line per distinct violation text", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: validationFailed([
        { field: "email", code: "INVALID_EMAIL" },
        { field: "plainPassword", code: "TOO_SHORT" },
        { field: "username", code: "TOO_SHORT" },
        { field: "username", code: "TOO_LONG" },
      ]),
    });

    expect(result).toBe(
      "Please enter a valid email address.\nPassword must be at least 6 characters.\nUsername must be 3 to 30 characters.",
    );
  });

  it("falls back to the registration text when no violation names a form field", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: validationFailed([{ field: "_csrf_token", code: "UNKNOWN_FIELD" }]),
    });

    expect(result).toBe("Registration failed. Please check your details and try again.");
  });
});

describe("mapAuthErrorMessage rate limits", () => {
  it("tells the player to try again later for REGISTRATION_RATE_LIMITED", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: backendError(429, "REGISTRATION_RATE_LIMITED", 3600),
    });

    expect(result).toBe("Too many registration attempts. Please try again later.");
  });

  it.each([
    [60, "Too many login attempts. Please try again in about 1 minute."],
    [120, "Too many login attempts. Please try again in about 2 minutes."],
    [90, "Too many login attempts. Please try again in about 2 minutes."],
    [30, "Too many login attempts. Please try again in about 30 seconds."],
    [1, "Too many login attempts. Please try again in about 1 second."],
  ])("names the wait for LOGIN_RATE_LIMITED with Retry-After %i", (seconds, expected) => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: backendError(429, "LOGIN_RATE_LIMITED", seconds),
    });

    expect(result).toBe(expected);
  });

  it("omits the wait for LOGIN_RATE_LIMITED without Retry-After", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: backendError(429, "LOGIN_RATE_LIMITED"),
    });

    expect(result).toBe("Too many login attempts. Please try again later.");
  });
});
