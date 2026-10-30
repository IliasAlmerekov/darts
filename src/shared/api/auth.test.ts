// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser, loginWithCredentials, logout, registerUser } from "./auth";
import { apiClient, ApiValidationError } from "./client";
import { ApiError, NetworkError, TimeoutError, UnauthorizedError } from "./errors";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { createMockResponse, respondWith } from "./test-utils";

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the user from the contract's login-success body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: {
          success: true,
          roles: ["ROLE_PLAYER"],
          id: 7,
          redirect: "http://localhost:5173/joined",
          gameId: 42,
        },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).resolves.toMatchObject({
      id: 7,
      gameId: 42,
    });
  });

  it("rejects a user wrapped in an envelope, which the contract does not document", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: {
          success: true,
          user: { success: true, roles: ["ROLE_USER"], id: 7, redirect: "/start" },
        },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape for authenticated user",
      status: 200,
    });
  });

  it("keeps the invitation error from the auth check", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: {
          success: true,
          roles: ["ROLE_PLAYER"],
          id: 7,
          redirect: "http://localhost:5173/joined",
          invitationError: "GAME_ROOM_FULL",
        },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).resolves.toMatchObject({
      id: 7,
      invitationError: "GAME_ROOM_FULL",
    });
  });

  it("should return authenticated user when the response is a direct user shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: {
          success: true,
          roles: ["ROLE_ADMIN"],
          id: 11,
          email: "admin@example.com",
          redirect: "/start",
        },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).resolves.toMatchObject({
      id: 11,
      email: "admin@example.com",
      roles: ["ROLE_ADMIN"],
      redirect: "/start",
    });
  });

  it("returns null on 401 AUTHENTICATION_REQUIRED", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: {
          success: false,
          error: "AUTHENTICATION_REQUIRED",
          message: "Authentication required.",
        },
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).resolves.toBeNull();
  });

  it("should throw TimeoutError instead of treating the request as logged out when the auth-check request times out", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const signal = init?.signal;

      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener(
          "abort",
          () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          },
          { once: true },
        );
      });
    });

    const requestPromise = getAuthenticatedUser({ timeoutMs: 50 });
    const errorPromise = requestPromise.catch((reason: unknown) => reason);
    await vi.advanceTimersByTimeAsync(51);
    const error = await errorPromise;
    expect(error).toBeInstanceOf(TimeoutError);
  });

  it("should throw ApiError when the auth-check returns a malformed authenticated user payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: { success: true, roles: ["ROLE_USER"], id: "7", redirect: "/start" },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape for authenticated user",
      status: 200,
    });
  });

  it("should throw ApiError when the auth-check user has an unknown role", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: { success: true, roles: ["ROLE_ROOT"], id: 7, redirect: "/start" },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape for authenticated user",
    });
  });

  it("rejects a 200 with success false, which the backend answers with a 401 now", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: { success: false },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape for authenticated user",
      status: 200,
      data: { success: false },
    });
  });

  it("should throw ApiError when the auth-check returns a profile envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: {
          success: true,
          profile: {
            id: 23,
            nickname: "Ton Eighty",
            stats: {
              gamesPlayed: 12,
              scoreAverage: 58.4,
            },
          },
        },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape for authenticated user",
      status: 200,
    });
  });
});

// Contract example: POST /api/login, 200 after a form login that joined an invitation.
const loggedInExample = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 1,
  email: "alice@example.com",
  username: "alice",
  redirect: "http://localhost:5173/joined",
};
const loginSuccessExample = { ...loggedInExample, gameId: 42 };
// The session user `/api/login/success` answers after the controller fallback.
const sessionUserExample = { ...loginSuccessExample, redirect: "http://localhost:5173/joined" };
const credentials = { email: "alice@example.com", password: "s3cr3t" };

describe("loginWithCredentials", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // No session user unless a test answers the session check itself.
    vi.spyOn(apiClient, "get").mockRejectedValue(new UnauthorizedError());
    vi.spyOn(clientLogger, "error").mockImplementation(() => undefined);
  });

  it("returns the logged-in user with the redirect and the joined game", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(loginSuccessExample));

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).resolves.toEqual(loginSuccessExample);
  });

  it("posts the credentials with the fixed CSRF field the backend origin check expects", async () => {
    const post = vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(loggedInExample));

    await loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" });

    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith(
      "/login",
      expect.any(String),
      expect.objectContaining({
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        skipAuthRedirect: true,
      }),
    );
    expect(Object.fromEntries(new URLSearchParams(String(post.mock.calls[0]?.[1])))).toEqual({
      _username: "alice@example.com",
      _password: "s3cr3t",
      _csrf_token: "csrf-token",
    });
  });

  it("keeps the invitation error when the stored invitation could not be joined", async () => {
    const response = { ...loggedInExample, invitationError: "GAME_ALREADY_STARTED" };
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(response));

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).resolves.toEqual(response);
  });

  it("does not read the session when the login answers with the user", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(loginSuccessExample));

    await loginWithCredentials(credentials);

    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("returns the session user when the backend answers with only the login-success redirect", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(
      respondWith({ redirect: "/api/login/success" }),
    );
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith(sessionUserExample));

    await expect(loginWithCredentials(credentials)).resolves.toEqual(sessionUserExample);
  });

  it("returns the session user when the user in the login answer redirects into the API", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(
      respondWith({ ...loggedInExample, redirect: "/api/login/success" }),
    );
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith(sessionUserExample));

    await expect(loginWithCredentials(credentials)).resolves.toEqual(sessionUserExample);
  });

  it("rejects with a login-session error that is no ApiError when a 200 leaves no session user", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(
      respondWith({ redirect: "/api/login/success" }),
    );

    const login = loginWithCredentials(credentials);

    await expect(login).rejects.toMatchObject({ name: "LoginSessionMissingError" });
    await expect(login).rejects.not.toBeInstanceOf(ApiError);
    const error: unknown = await login.catch((thrown: unknown) => thrown);
    expect(mapAuthErrorMessage({ flow: "login", error })).toBe("Login failed. Please try again.");
  });

  it("returns the session user and logs the failure when the login request fails but the session exists", async () => {
    const failure = new NetworkError();
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(failure);
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith(sessionUserExample));

    await expect(loginWithCredentials(credentials)).resolves.toEqual(sessionUserExample);
    expect(clientLogger.error).toHaveBeenCalledWith("auth.login.failed", { error: failure });
  });

  it("rejects with the original error when the login request fails and no session exists", async () => {
    const failure = new NetworkError();
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(failure);

    await expect(loginWithCredentials(credentials)).rejects.toBe(failure);
    expect(apiClient.get).toHaveBeenCalledOnce();
  });

  it("rejects with the original error and logs the session check when that check throws", async () => {
    const failure = new NetworkError();
    const sessionCheckFailure = new TimeoutError();
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(failure);
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(sessionCheckFailure);

    await expect(loginWithCredentials(credentials)).rejects.toBe(failure);
    expect(clientLogger.error).toHaveBeenCalledWith("auth.login.session-check-after-error.failed", {
      error: sessionCheckFailure,
    });
  });

  it("rejects a 401 at once, without a session check", async () => {
    const invalidCredentials = new UnauthorizedError("Unauthorized", {
      success: false,
      error: "LOGIN_INVALID_CREDENTIALS",
      message: "Invalid credentials.",
    });
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(invalidCredentials);

    await expect(loginWithCredentials(credentials)).rejects.toBe(invalidCredentials);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("rejects with ApiValidationError when login answers 200 with only the old error field", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(
      respondWith({ error: "Invalid credentials.", last_username: "alice" }),
    );

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiValidationError when the invitation error is not a known code", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(
      respondWith({ ...loginSuccessExample, invitationError: "GAME_ON_FIRE" }),
    );

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiValidationError when login returns a malformed response shape", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith({ redirect: 42 }));

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiValidationError when login returns none of the known fields", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith({}));

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).rejects.toBeInstanceOf(ApiValidationError);
  });
});

// Contract example: POST /api/register, 201. The body is the `/api/login/success` body.
const registrationExample = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 1,
  email: "alice@example.com",
  username: "alice",
  redirect: "http://localhost:5173/joined",
  gameId: 42,
};

describe("registerUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should call apiClient.post with mapped registration payload", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(registrationExample));

    const result = await registerUser({
      username: "alice",
      email: "alice@example.com",
      password: "s3cr3t",
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/register",
      {
        username: "alice",
        email: "alice@example.com",
        plainPassword: "s3cr3t",
      },
      expect.objectContaining({ validate: expect.any(Object) }),
    );
    expect(result).toEqual(registrationExample);
  });

  it("resolves when registration answers without a game, as after a stale invitation", async () => {
    const response = {
      success: true,
      roles: ["ROLE_PLAYER"],
      id: 1,
      email: "alice@example.com",
      username: "alice",
      redirect: "http://localhost:5173/start",
      invitationError: "GAME_ALREADY_STARTED",
    };
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(response));

    await expect(
      registerUser({ username: "alice", email: "alice@example.com", password: "s3cr3t" }),
    ).resolves.toEqual(response);
  });

  it("rejects with ApiValidationError when registration answers with the old message body", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(
      respondWith({ success: true, message: "Registrierung erfolgreich", redirect: "/" }),
    );

    await expect(
      registerUser({ username: "alice", email: "alice@example.com", password: "s3cr3t" }),
    ).rejects.toBeInstanceOf(ApiValidationError);
  });
});

describe("logout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the success callback when logout answers 204 without a body", async () => {
    const onSuccess = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({ body: null, status: 204, url: "/api/logout" }),
    );

    await logout(onSuccess);

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("rejects with ApiValidationError when logout answers with a JSON body", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith({ success: true }));

    await expect(logout()).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("should not call the success callback when logout fails", async () => {
    const onSuccess = vi.fn();
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(new Error("Network error"));

    await expect(logout(onSuccess)).rejects.toThrow("Network error");
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
