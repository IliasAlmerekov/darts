// @vitest-environment jsdom
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/shared/hooks/useAuthenticatedUser", () => ({
  useAuthenticatedUser: () => useAuthenticatedUserMock(),
}));

vi.mock("@/shared/api/auth", () => ({
  registerUser: (...args: unknown[]) => registerUserMock(...args),
  getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { warn: vi.fn(), error: vi.fn() },
}));

import { startTransition } from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRegistrationPage } from "./useRegistrationPage";
import { ROUTES } from "@/lib/router/routes";
import { ApiError } from "@/shared/api";
import type { AuthenticatedUser } from "@/shared/api/auth";
import { authQueries } from "@/shared/query/auth.queries";
import { queryClient } from "@/shared/query/queryClient";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { getActiveGameId, setCurrentGameId } from "@/shared/store";

const navigateMock = vi.fn();
const useAuthenticatedUserMock = vi.fn();
const registerUserMock = vi.fn();
const getAuthenticatedUserMock = vi.fn();

const player: AuthenticatedUser = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 1,
  username: "a",
  redirect: "/joined",
};

const joinedPlayer: AuthenticatedUser = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 23,
  username: "Ton Eighty",
  redirect: "/joined",
};

async function register(
  username = "john",
  email = "john@example.com",
  password = "Password123!",
): Promise<{ current: ReturnType<typeof useRegistrationPage> }> {
  const { result } = renderHook(() => useRegistrationPage());

  const formData = new FormData();
  formData.set("username", username);
  formData.set("email", email);
  formData.set("password", password);

  await act(async () => {
    startTransition(() => {
      result.current.formAction(formData);
    });
  });

  return result;
}

describe("useRegistrationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    setCurrentGameId(null);
    useAuthenticatedUserMock.mockReturnValue({ user: null, loading: false, error: null });
  });

  it("should show the form before registration", () => {
    const { result } = renderHook(() => useRegistrationPage());
    expect(result.current.screen).toEqual({ type: "form" });
  });

  it("should show the joining state after a registration without invitation error", async () => {
    registerUserMock.mockResolvedValueOnce({ ...player, gameId: 42 });

    const result = await register();

    expect(result.current.screen).toEqual({ type: "joining" });
  });

  it.each([
    ["GAME_ALREADY_STARTED", "This game has already started"],
    ["GAME_ROOM_FULL", "This game is full"],
    ["GAME_NOT_FOUND", "This game no longer exists"],
    ["GAME_JOIN_NOT_ALLOWED", "This game can no longer be joined"],
  ])("should show the invitation error screen for %s", async (code, message) => {
    registerUserMock.mockResolvedValueOnce({ ...player, invitationError: code });

    const result = await register();

    expect(result.current.screen).toEqual({ type: "invitation-error", message });
  });

  it("should navigate to the Player profile from the invitation error screen", async () => {
    registerUserMock.mockResolvedValueOnce({ ...player, invitationError: "GAME_ROOM_FULL" });
    const result = await register();

    act(() => result.current.goToPlayerProfile());

    expect(navigateMock).toHaveBeenCalledWith(ROUTES.playerProfile);
  });

  it("should clear the handled invitation error from the cached user before navigating", async () => {
    const failed: AuthenticatedUser = { ...player, invitationError: "GAME_ROOM_FULL" };
    registerUserMock.mockResolvedValueOnce(failed);
    const result = await register();

    act(() => result.current.goToPlayerProfile());

    expect(queryClient.getQueryData(authQueries.me().queryKey)).toEqual({
      ...player,
      redirect: ROUTES.playerProfile,
    });
    expect(navigateMock).toHaveBeenCalledWith(ROUTES.playerProfile);
  });

  it("should show the invitation error screen after a reload from the cached session user", () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: { ...player, invitationError: "GAME_ROOM_FULL" },
      loading: false,
      error: null,
    });
    const { result } = renderHook(() => useRegistrationPage());
    expect(result.current.screen).toEqual({
      type: "invitation-error",
      message: "This game is full",
    });
  });

  it("shows the violation texts when registration fails with REQUEST_VALIDATION_FAILED", async () => {
    registerUserMock.mockRejectedValueOnce(
      new ApiError("REQUEST_VALIDATION_FAILED", {
        status: 422,
        data: {
          success: false,
          error: "REQUEST_VALIDATION_FAILED",
          message: "The request body failed validation.",
          violations: [
            {
              field: "email",
              code: "INVALID_EMAIL",
              message: "Please enter a valid email address",
            },
            { field: "plainPassword", code: "TOO_SHORT", message: "Too short." },
          ],
        },
      }),
    );

    const result = await register("john", "invalid-email", "123");

    expect(registerUserMock).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe(
      "Please enter a valid email address.\nPassword must be at least 6 characters.",
    );
    expect(result.current.values).toEqual({
      username: "john",
      email: "invalid-email",
      password: "123",
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("should navigate to the start route when registration returns an off-origin redirect", async () => {
    registerUserMock.mockResolvedValueOnce({ ...player, redirect: "/\\evil.example" });

    await register();

    expect(navigateMock).toHaveBeenCalledWith("/start");
    expect(navigateMock).not.toHaveBeenCalledWith("/\\evil.example");
    expect(vi.mocked(clientLogger.warn)).toHaveBeenCalledWith("auth.registration.unsafe_redirect");
  });

  it("should not warn when registration redirects to the start route by a same-origin URL", async () => {
    registerUserMock.mockResolvedValueOnce({
      ...player,
      redirect: `${window.location.origin}/start`,
    });

    await register();

    expect(navigateMock).toHaveBeenCalledWith("/start");
    expect(vi.mocked(clientLogger.warn)).not.toHaveBeenCalled();
  });

  it("should store the game id, cache the user and navigate when registration joins a game", async () => {
    registerUserMock.mockResolvedValueOnce({ ...joinedPlayer, gameId: 42 });

    await register();

    expect(getActiveGameId()).toBe(42);
    expect(queryClient.getQueryData(authQueries.me().queryKey)).toEqual({
      ...joinedPlayer,
      gameId: 42,
    });
    expect(navigateMock).toHaveBeenCalledWith("/joined");
  });

  it("should cache the user and not navigate when the invitation failed", async () => {
    const failed = { ...joinedPlayer, invitationError: "GAME_ALREADY_STARTED" };
    registerUserMock.mockResolvedValueOnce(failed);

    await register();

    expect(queryClient.getQueryData(authQueries.me().queryKey)).toEqual(failed);
    expect(navigateMock).not.toHaveBeenCalled();
    expect(getActiveGameId()).toBeNull();
  });

  it("should clear a game id left over from an earlier session when registration joins none", async () => {
    setCurrentGameId(7);
    registerUserMock.mockResolvedValueOnce({ ...joinedPlayer, redirect: "/start" });

    await register();

    expect(getActiveGameId()).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith("/start");
  });

  it("should keep the registered user when a pending session check answers late with no user", async () => {
    let answerSessionCheck: (user: null) => void = () => {};
    getAuthenticatedUserMock.mockReturnValueOnce(
      new Promise((resolve) => {
        answerSessionCheck = resolve;
      }),
    );
    const sessionCheck = queryClient.prefetchQuery(authQueries.me());
    registerUserMock.mockResolvedValueOnce({ ...joinedPlayer, gameId: 42 });

    await register();
    answerSessionCheck(null);
    await sessionCheck;

    expect(queryClient.getQueryData(authQueries.me().queryKey)).toEqual({
      ...joinedPlayer,
      gameId: 42,
    });
  });
});
