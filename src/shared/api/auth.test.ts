// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAuthenticatedUser,
  isRoleArray,
  loginWithCredentials,
  logout,
  registerUser,
} from "./auth";
import { apiClient } from "./client";
import { TimeoutError } from "./errors";
import { createMockResponse } from "./test-utils";

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns authenticated user for successful response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: {
          success: true,
          user: {
            success: true,
            roles: ["ROLE_USER"],
            id: 7,
            redirect: "/start",
            gameId: 42,
          },
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

  it("returns null for a 401 auth-check response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: { message: "Unauthorized" },
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).resolves.toBeNull();
  });

  it("throws TimeoutError after timeout instead of treating the request as logged out", async () => {
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

  it("throws ApiError when auth-check returns malformed authenticated user payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: {
          success: true,
          user: {
            success: true,
            roles: ["ROLE_USER"],
            id: "7",
            redirect: "/start",
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

  it("returns null for explicit unauthenticated auth-check payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: { success: false },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "/api/login/success",
      }),
    );

    await expect(getAuthenticatedUser()).resolves.toBeNull();
  });
});

describe("loginWithCredentials", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws ApiError when login returns malformed response shape", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({ redirect: 42 });

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape for login",
      status: 200,
    });
  });
});

describe("registerUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should call apiClient.post with mapped registration payload", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({ redirect: "/start" });

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
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(result).toEqual({ redirect: "/start" });
  });

  it("should not issue CSRF ping when refreshCsrf is false", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(undefined);
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({ redirect: "/start" });

    await registerUser(
      { username: "alice", email: "alice@example.com", password: "s3cr3t" },
      false,
    );

    expect(getSpy).not.toHaveBeenCalled();
  });

  it("should route CSRF ping through apiClient.get with skipAuthRedirect when refreshCsrf is true", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(undefined);
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({ redirect: "/start" });

    await registerUser({ username: "alice", email: "alice@example.com", password: "s3cr3t" }, true);

    expect(getSpy).toHaveBeenCalledWith(
      "/csrf",
      expect.objectContaining({ skipAuthRedirect: true, validate: expect.any(Function) }),
    );
  });

  // Ticket 2: bare fetch("/register") bypasses API_BASE_URL — must never happen
  // This test FAILS on the current buggy implementation
  it("should not call native fetch with bare /register path (must include API_BASE_URL)", async () => {
    // Mock apiClient.post so only the CSRF-ping path can trigger native fetch
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({ redirect: "/start" });
    // Intercept all native fetch calls; reject so the ping error is caught and swallowed
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    await registerUser({ username: "alice", email: "alice@example.com", password: "s3cr3t" }, true);

    const bareRegisterCalls = fetchSpy.mock.calls.filter(
      ([url]) => typeof url === "string" && url === "/register",
    );
    expect(bareRegisterCalls).toHaveLength(0);
  });

  it("should proceed with registration even when CSRF ping rejects", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(new Error("Network error"));
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({ redirect: "/start" });

    const result = await registerUser(
      { username: "alice", email: "alice@example.com", password: "s3cr3t" },
      true,
    );

    expect(apiClient.post).toHaveBeenCalled();
    expect(result).toEqual({ redirect: "/start" });
  });

  it("throws ApiError when registration returns malformed response shape", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({ redirect: 42 });

    await expect(
      registerUser({ username: "alice", email: "alice@example.com", password: "s3cr3t" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape for registration",
      status: 200,
    });
  });
});

describe("isRoleArray", () => {
  it("should return true for valid role strings", () => {
    expect(isRoleArray(["ROLE_USER"])).toBe(true);
    expect(isRoleArray(["ROLE_ADMIN"])).toBe(true);
    expect(isRoleArray(["ROLE_PLAYER"])).toBe(true);
    expect(isRoleArray(["ROLE_USER", "ROLE_ADMIN"])).toBe(true);
  });

  it("should return false for unknown role strings", () => {
    expect(isRoleArray(["INVALID"])).toBe(false);
  });

  it("should return false for non-string array elements", () => {
    expect(isRoleArray([123])).toBe(false);
  });

  it("should return false for null", () => {
    expect(isRoleArray(null)).toBe(false);
  });
});

describe("logout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the success callback after successful logout", async () => {
    const onSuccess = vi.fn();
    vi.spyOn(apiClient, "post").mockResolvedValueOnce(undefined);

    await logout(onSuccess);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/logout",
      undefined,
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("does not call the success callback when logout fails", async () => {
    const onSuccess = vi.fn();
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(new Error("Network error"));

    await expect(logout(onSuccess)).rejects.toThrow("Network error");
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
