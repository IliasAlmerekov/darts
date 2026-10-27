// @vitest-environment jsdom
import { startTransition } from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLogin } from "./useLogin";
import { ApiError } from "@/shared/api";
import { queryClient } from "@/shared/query/queryClient";
import { $currentGameId, setCurrentGameId } from "@/shared/store";

const loginWithCredentialsMock = vi.fn();
const getAuthenticatedUserMock = vi.fn();

vi.mock("@/shared/api/auth", () => ({
  loginWithCredentials: (...args: unknown[]) => loginWithCredentialsMock(...args),
  getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args),
}));

const AUTH_KEY = ["auth", "me"] as const;
const SEEDED_USER = { success: true, roles: ["ROLE_ADMIN"], id: 99, redirect: "/start" };

const loggedInPlayer = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 23,
  email: "player@test.com",
  username: "Ton Eighty",
  redirect: "http://localhost:3000/joined",
};
const joinedPlayer = { ...loggedInPlayer, gameId: 42 };

async function submitLogin(): Promise<ReturnType<typeof useLogin>> {
  const { result } = renderHook(() => useLogin());

  const formData = new FormData();
  formData.set("_username", "player@test.com");
  formData.set("_password", "password");

  await act(async () => {
    startTransition(() => {
      result.current.formAction(formData);
    });
  });

  return result.current;
}

describe("useLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    queryClient.setQueryData(AUTH_KEY, SEEDED_USER);
    setCurrentGameId(null);
  });

  it("stores the logged-in user and the joined game from the login response", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({ type: "user", user: joinedPlayer });

    const state = await submitLogin();

    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(joinedPlayer);
    expect($currentGameId.get()).toBe(42);
    expect(getAuthenticatedUserMock).not.toHaveBeenCalled();
    expect(state.error).toBeNull();
  });

  it("stores the user with the invitation error and keeps the current game", async () => {
    setCurrentGameId(7);
    const rejectedInvitation = { ...loggedInPlayer, invitationError: "GAME_ALREADY_STARTED" };
    loginWithCredentialsMock.mockResolvedValueOnce({ type: "user", user: rejectedInvitation });

    const state = await submitLogin();

    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(rejectedInvitation);
    expect($currentGameId.get()).toBe(7);
    expect(state.error).toBeNull();
  });

  it("reads the session user when the login answers with the login-success redirect", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({
      type: "user",
      user: { success: true, roles: ["ROLE_PLAYER"], id: 23, redirect: "/api/login/success" },
    });
    getAuthenticatedUserMock.mockResolvedValueOnce(joinedPlayer);

    const state = await submitLogin();

    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(joinedPlayer);
    expect($currentGameId.get()).toBe(42);
    expect(state.error).toBeNull();
  });

  it("reads the session user when the login answers without the user", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({ type: "session" });
    getAuthenticatedUserMock.mockResolvedValueOnce(joinedPlayer);

    const state = await submitLogin();

    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(joinedPlayer);
    expect($currentGameId.get()).toBe(42);
    expect(state.error).toBeNull();
  });

  it("reads the session user when the login fails without a reason", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({ type: "failure", error: null });
    getAuthenticatedUserMock.mockResolvedValueOnce(joinedPlayer);

    const state = await submitLogin();

    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(joinedPlayer);
    expect(state.error).toBeNull();
  });

  it("stores the session user when the login request fails but the session exists", async () => {
    loginWithCredentialsMock.mockRejectedValueOnce(new Error("Network request failed"));
    getAuthenticatedUserMock.mockResolvedValueOnce(joinedPlayer);

    const state = await submitLogin();

    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(joinedPlayer);
    expect($currentGameId.get()).toBe(42);
    expect(state.error).toBeNull();
  });

  it("sets the network error when the login request fails and no session exists", async () => {
    loginWithCredentialsMock.mockRejectedValueOnce(new Error("Network request failed"));
    getAuthenticatedUserMock.mockResolvedValueOnce(null);

    const state = await submitLogin();

    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(SEEDED_USER);
    expect(state.error).toBe("Network error. Please check your connection and try again.");
  });

  it("maps an unsuccessful login response without exposing the raw message", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({ type: "failure", error: "unauthorized" });

    const state = await submitLogin();

    expect(getAuthenticatedUserMock).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(SEEDED_USER);
    expect(state.error).toBe("Incorrect email or password.");
  });

  it("maps an authorization failure from login-success without exposing the raw error", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({ type: "session" });
    getAuthenticatedUserMock.mockRejectedValueOnce(
      new ApiError("Authorization failed for authenticated user", {
        status: 401,
        data: { success: false },
      }),
    );

    const state = await submitLogin();

    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(SEEDED_USER);
    expect(state.error).toBe("Incorrect email or password.");
  });
});
