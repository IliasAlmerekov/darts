// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser, logout, registerUser } from "./auth";
import { apiClient } from "./client";
import { $authChecked, $user, setAuthenticatedUser } from "@/store/auth";

type AuthResponseBody = {
  success: boolean;
  user?: {
    success: boolean;
    roles: string[];
    id: number;
    redirect: string;
    gameId?: number | null;
  };
};

function createMockResponse(body: AuthResponseBody): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    url: "/api/login/success",
    json: vi.fn(async () => body),
  } as unknown as Response;
}

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
        success: true,
        user: {
          success: true,
          roles: ["ROLE_USER"],
          id: 7,
          redirect: "/start",
          gameId: 42,
        },
      }),
    );

    await expect(getAuthenticatedUser()).resolves.toMatchObject({
      id: 7,
      gameId: 42,
    });
  });

  it("aborts request after timeout", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const signal = init?.signal;

      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener(
          "abort",
          () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          },
          { once: true },
        );
      });
    });

    const requestPromise = getAuthenticatedUser({ timeoutMs: 50 });
    const assertion = expect(requestPromise).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(51);

    await assertion;
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

    expect(apiClient.post).toHaveBeenCalledWith("/register", {
      username: "alice",
      email: "alice@example.com",
      plainPassword: "s3cr3t",
    });
    expect(result).toEqual({ redirect: "/start" });
  });

  it("should not issue CSRF ping when refreshCsrf is false", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(undefined);
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({ redirect: "/start" });

    await registerUser({ username: "alice", email: "alice@example.com", password: "s3cr3t" }, false);

    expect(getSpy).not.toHaveBeenCalled();
  });

  // Ticket 2: CSRF ping must go through apiClient.get, NOT raw fetch("/register")
  // This test FAILS on the current buggy implementation (bare fetch call on line 150)
  it("should route CSRF ping through apiClient.get with skipAuthRedirect when refreshCsrf is true", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(undefined);
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({ redirect: "/start" });

    await registerUser({ username: "alice", email: "alice@example.com", password: "s3cr3t" }, true);

    expect(getSpy).toHaveBeenCalledWith(
      "/register",
      expect.objectContaining({ skipAuthRedirect: true }),
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
});

describe("logout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("invalidates cached auth state after successful logout", async () => {
    setAuthenticatedUser({
      success: true,
      roles: ["ROLE_ADMIN"],
      id: 11,
      redirect: "/start",
    });
    vi.spyOn(apiClient, "post").mockResolvedValueOnce(undefined);

    await logout();

    expect(apiClient.post).toHaveBeenCalledWith("/logout");
    expect($user.get()).toBeNull();
    expect($authChecked.get()).toBe(false);
  });
});
