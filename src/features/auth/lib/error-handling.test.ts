import { describe, expect, it } from "vitest";
import { ApiError, NetworkError, UnauthorizedError } from "@/lib/api";
import { isCsrfRelatedAuthError, mapAuthErrorMessage } from "./error-handling";

describe("mapAuthErrorMessage", () => {
  it("maps invalid password message for login", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      rawMessage: "Invalid password",
    });

    expect(result).toBe("Incorrect password.");
  });

  it("maps invalid email message for login", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      rawMessage: "Invalid email",
    });

    expect(result).toBe("Incorrect email address.");
  });

  it("maps server errors for login", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: new ApiError("Internal Server Error", {
        status: 500,
      }),
    });

    expect(result).toBe("Server error. Please try again later.");
  });

  it("maps network errors for registration", () => {
    const result = mapAuthErrorMessage({
      flow: "registration",
      error: new NetworkError(),
    });

    expect(result).toBe("Network error. Please check your connection and try again.");
  });

  it("maps registration validation payload fields", () => {
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

  it("maps username conflicts in registration", () => {
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

  it("maps unauthorized login to credentials message", () => {
    const result = mapAuthErrorMessage({
      flow: "login",
      error: new UnauthorizedError(),
    });

    expect(result).toBe("Incorrect email or password.");
  });
});

describe("isCsrfRelatedAuthError", () => {
  it("detects csrf errors from raw login message", () => {
    expect(isCsrfRelatedAuthError(undefined, "Invalid CSRF token")).toBe(true);
  });

  it("detects csrf errors from api payload", () => {
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
