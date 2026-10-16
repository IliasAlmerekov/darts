// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser, loginWithCredentials, logout, registerUser } from "./auth";
import { apiClient, ApiValidationError } from "./client";
import { TimeoutError } from "./errors";
import { queryClient } from "@/shared/query/queryClient";
import {
  $currentGameId,
  $invitation,
  GAME_ID_STORAGE_KEY,
  resetRoomStore,
  setCurrentGameId,
  setInvitation,
} from "@/shared/store/game-session";
import { $gameData, resetGameStore, setGameData } from "@/shared/store/game-state";
import { buildGameThrowsResponse } from "@/shared/types/game.test-support";
import { createMockResponse, respondWith } from "./test-utils";

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return authenticated user when the response is successful", async () => {
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

  it("should normalize a profile envelope into a player authenticated user", async () => {
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

    await expect(getAuthenticatedUser()).resolves.toEqual({
      success: true,
      roles: ["ROLE_PLAYER"],
      id: 23,
      username: "Ton Eighty",
      redirect: "/playerprofile",
      profile: {
        id: 23,
        nickname: "Ton Eighty",
        stats: {
          gamesPlayed: 12,
          scoreAverage: 58.4,
        },
      },
    });
  });

  it("should return null when the auth-check response is 401", async () => {
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

  it("should throw ApiError when the auth-check payload is explicitly unauthorized", async () => {
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
      message: "Authorization failed for authenticated user",
      status: 401,
      data: { success: false },
    });
  });

  it("should throw ApiError when the auth-check returns a malformed profile envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: {
          success: true,
          profile: {
            id: 23,
            nickname: "Ton Eighty",
            stats: {
              gamesPlayed: "12",
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

describe("loginWithCredentials", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the logged-in user with the redirect and the joined game", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(loginSuccessExample));

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).resolves.toEqual({ type: "user", user: loginSuccessExample });
  });

  it("keeps the invitation error when the stored invitation could not be joined", async () => {
    const response = { ...loggedInExample, invitationError: "GAME_ALREADY_STARTED" };
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(response));

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).resolves.toEqual({ type: "user", user: response });
  });

  it("returns the login error when the backend answers without a user", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(
      respondWith({ success: false, last_username: "alice", error: "Invalid credentials." }),
    );

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).resolves.toEqual({ type: "failure", error: "Invalid credentials." });
  });

  it("returns the login error when the backend answers with only an error", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(
      respondWith({ error: "Invalid credentials." }),
    );

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).resolves.toEqual({ type: "failure", error: "Invalid credentials." });
  });

  it("asks for the session user when the backend answers with only the login-success redirect", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(
      respondWith({ redirect: "/api/login/success" }),
    );

    await expect(
      loginWithCredentials({ email: "alice@example.com", password: "s3cr3t" }),
    ).resolves.toEqual({ type: "session" });
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

  it("should not issue CSRF ping when refreshCsrf is false", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockImplementationOnce(
        respondWith({ success: true, tokens: { user_registration: "csrf-token" } }),
      );
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(registrationExample));

    await registerUser(
      { username: "alice", email: "alice@example.com", password: "s3cr3t" },
      false,
    );

    expect(getSpy).not.toHaveBeenCalled();
  });

  it("should route CSRF ping through apiClient.get with skipAuthRedirect when refreshCsrf is true", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockImplementationOnce(
        respondWith({ success: true, tokens: { user_registration: "csrf-token" } }),
      );
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(registrationExample));

    await registerUser({ username: "alice", email: "alice@example.com", password: "s3cr3t" }, true);

    expect(getSpy).toHaveBeenCalledWith(
      "/csrf",
      expect.objectContaining({ skipAuthRedirect: true, validate: expect.any(Object) }),
    );
  });

  // Ticket 2: bare fetch("/register") bypasses API_BASE_URL — must never happen
  // This test FAILS on the current buggy implementation
  it("should not call native fetch with bare /register path (must include API_BASE_URL)", async () => {
    // Mock apiClient.post so only the CSRF-ping path can trigger native fetch
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(registrationExample));
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
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(registrationExample));

    const result = await registerUser(
      { username: "alice", email: "alice@example.com", password: "s3cr3t" },
      true,
    );

    expect(apiClient.post).toHaveBeenCalled();
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

  it("proceeds with registration when the CSRF response is malformed", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith({ success: true, tokens: [] }));
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(registrationExample));

    await expect(
      registerUser({ username: "alice", email: "alice@example.com", password: "s3cr3t" }, true),
    ).resolves.toEqual(registrationExample);
  });
});

describe("logout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetRoomStore();
    resetGameStore();
  });

  it("should call the success callback when logout succeeds", async () => {
    const onSuccess = vi.fn();
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(""));

    await logout(onSuccess);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/logout",
      undefined,
      expect.objectContaining({ redirect: "manual", validate: expect.any(Object) }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("should clear the query cache when logout succeeds", async () => {
    queryClient.setQueryData(["auth", "me"], { id: 1 });
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(""));

    await logout();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("should clear the room store, the stored game id and the game store when logout succeeds", async () => {
    setCurrentGameId(7);
    setInvitation({ gameId: 7, invitationLink: "/invite/7" });
    setGameData(buildGameThrowsResponse());
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(""));

    await logout();

    expect($currentGameId.get()).toBeNull();
    expect($invitation.get()).toBeNull();
    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBeNull();
    expect($gameData.get()).toBeNull();
  });

  it("should keep the room store and the game store when logout fails", async () => {
    setCurrentGameId(7);
    setGameData(buildGameThrowsResponse());
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(new Error("Network error"));

    await expect(logout()).rejects.toThrow("Network error");

    expect($currentGameId.get()).toBe(7);
    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBe("7");
    expect($gameData.get()).not.toBeNull();
  });

  it("rejects with ApiValidationError when logout answers with a JSON body", async () => {
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith({ success: true }));

    await expect(logout()).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("should keep the query cache when logout fails", async () => {
    queryClient.setQueryData(["auth", "me"], { id: 1 });
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(new Error("Network error"));

    await expect(logout()).rejects.toThrow("Network error");

    expect(queryClient.getQueryData(["auth", "me"])).toEqual({ id: 1 });
  });

  it("should not call the success callback when logout fails", async () => {
    const onSuccess = vi.fn();
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(new Error("Network error"));

    await expect(logout(onSuccess)).rejects.toThrow("Network error");
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
