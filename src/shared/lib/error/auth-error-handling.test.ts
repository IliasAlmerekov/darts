// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ApiError, NetworkError, UnauthorizedError } from "@/shared/api";
import { isCsrfRelatedAuthError, mapAuthErrorMessage } from "./auth-error-handling";

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
