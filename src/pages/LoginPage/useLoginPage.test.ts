// @vitest-environment jsdom
import { startTransition } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLoginPage } from "./useLoginPage";
import { ROUTES } from "@/lib/router/routes";
import { NetworkError, UnauthorizedError } from "@/shared/api";
import type { AuthenticatedUser } from "@/shared/api/auth";
import { authQueries } from "@/shared/query/auth.queries";
import { queryClient } from "@/shared/query/queryClient";
import { $currentGameId, setCurrentGameId } from "@/shared/store";

const navigateMock = vi.fn();
const useAuthenticatedUserMock = vi.fn();
const useLocationMock = vi.fn();
const loginWithCredentialsMock = vi.fn();
const getAuthenticatedUserMock = vi.fn();
const assignMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => useLocationMock(),
  };
});

vi.mock("@/shared/api/auth", () => ({
  loginWithCredentials: (...args: unknown[]) => loginWithCredentialsMock(...args),
  getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args),
}));

vi.mock("@/shared/hooks/useAuthenticatedUser", () => ({
  useAuthenticatedUser: () => useAuthenticatedUserMock(),
}));

const loggedInPlayer = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 23,
  username: "Ton Eighty",
  redirect: "http://localhost:3000/joined",
};
const joinedPlayer = { ...loggedInPlayer, gameId: 42 };

const AUTH_KEY = authQueries.me().queryKey;
const SEEDED_USER: AuthenticatedUser = {
  success: true,
  roles: ["ROLE_ADMIN"],
  id: 99,
  redirect: "/start",
};

function givenAuthCheck(user: unknown, loading = false): void {
  useAuthenticatedUserMock.mockReturnValue({ user, loading, error: null });
}

async function submitLogin(): Promise<ReturnType<typeof useLoginPage>> {
  const { result } = renderHook(() => useLoginPage());

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

describe("useLoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: assignMock,
      },
    });
    givenAuthCheck(null);
    setCurrentGameId(null);
    useLocationMock.mockReturnValue({
      pathname: "/",
      search: "",
      hash: "",
      key: "test",
      state: null,
    });
  });

  it("shows the login check while the auth check is pending", () => {
    givenAuthCheck(null, true);

    const { result } = renderHook(() => useLoginPage());

    expect(result.current.screen).toEqual({ type: "checking" });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("shows the form when the auth check finds no login", () => {
    const { result } = renderHook(() => useLoginPage());

    expect(result.current.screen).toEqual({ type: "form" });
  });

  it("sends a remembered player to the redirect and keeps the form hidden", async () => {
    givenAuthCheck(joinedPlayer);

    const { result } = renderHook(() => useLoginPage());

    expect(result.current.screen).toEqual({ type: "checking" });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(ROUTES.joined);
    });
  });

  it("does not send a player with a stale stored game to the host start page", async () => {
    givenAuthCheck(joinedPlayer);
    setCurrentGameId(99);

    renderHook(() => useLoginPage());

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(ROUTES.joined);
    });
    expect(navigateMock).not.toHaveBeenCalledWith(ROUTES.start(99));
  });

  it("sends an admin with a stored game to that game's start page", async () => {
    givenAuthCheck({ success: true, roles: ["ROLE_ADMIN"], id: 1, redirect: "/start" });
    setCurrentGameId(99);

    renderHook(() => useLoginPage());

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/start/99");
    });
  });

  it("sends an admin to the protected source route", async () => {
    givenAuthCheck({ success: true, roles: ["ROLE_ADMIN"], id: 1, redirect: "/start/42" });
    useLocationMock.mockReturnValue({
      pathname: "/",
      search: "",
      hash: "",
      key: "test",
      state: { from: "/statistics" },
    });

    renderHook(() => useLoginPage());

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/statistics");
    });
  });

  it("falls back to the internal start route when the user has an external redirect", async () => {
    givenAuthCheck({
      success: true,
      roles: ["ROLE_ADMIN"],
      id: 1,
      redirect: "https://evil.example/phishing",
    });

    renderHook(() => useLoginPage());

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(ROUTES.start());
    });
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("shows the invitation error instead of navigating", async () => {
    const rejectedInvitation = { ...loggedInPlayer, invitationError: "GAME_ROOM_FULL" };
    givenAuthCheck(rejectedInvitation);

    const { result } = renderHook(() => useLoginPage());

    expect(result.current.screen).toEqual({
      type: "invitation-error",
      message: "This game is full",
    });
    await waitFor(() => {
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  it("drops the handled invitation error and sends the player to the profile", () => {
    const rejectedInvitation = { ...loggedInPlayer, invitationError: "GAME_ROOM_FULL" };
    givenAuthCheck(rejectedInvitation);
    queryClient.setQueryData(["auth", "me"], rejectedInvitation);

    const { result } = renderHook(() => useLoginPage());

    act(() => {
      result.current.goToPlayerProfile();
    });

    expect(queryClient.getQueryData(["auth", "me"])).toEqual({
      ...loggedInPlayer,
      redirect: ROUTES.playerProfile,
    });
  });

  describe("form login", () => {
    beforeEach(() => {
      queryClient.setQueryData(AUTH_KEY, SEEDED_USER);
    });

    it("stores the logged-in user and the joined game", async () => {
      loginWithCredentialsMock.mockResolvedValueOnce(joinedPlayer);

      const state = await submitLogin();

      expect(loginWithCredentialsMock).toHaveBeenCalledWith({
        email: "player@test.com",
        password: "password",
      });
      expect(queryClient.getQueryData(AUTH_KEY)).toEqual(joinedPlayer);
      expect($currentGameId.get()).toBe(42);
      expect(state.error).toBeNull();
    });

    it("keeps a stored Current game id when the logged-in user has no game", async () => {
      setCurrentGameId(7);
      loginWithCredentialsMock.mockResolvedValueOnce(loggedInPlayer);

      const state = await submitLogin();

      expect(queryClient.getQueryData(AUTH_KEY)).toEqual(loggedInPlayer);
      expect($currentGameId.get()).toBe(7);
      expect(state.error).toBeNull();
    });

    it("stores the user with the invitation error", async () => {
      const rejectedInvitation = { ...loggedInPlayer, invitationError: "GAME_ALREADY_STARTED" };
      loginWithCredentialsMock.mockResolvedValueOnce(rejectedInvitation);

      const state = await submitLogin();

      expect(queryClient.getQueryData(AUTH_KEY)).toEqual(rejectedInvitation);
      expect(state.error).toBeNull();
    });

    it("keeps the logged-in user when a pending Remembered login check answers late with no user", async () => {
      let answerSessionCheck: (user: null) => void = () => {};
      getAuthenticatedUserMock.mockReturnValueOnce(
        new Promise((resolve) => {
          answerSessionCheck = resolve;
        }),
      );
      const sessionCheck = queryClient.prefetchQuery(authQueries.me());
      loginWithCredentialsMock.mockResolvedValueOnce(joinedPlayer);

      await submitLogin();
      answerSessionCheck(null);
      await sessionCheck;

      expect(queryClient.getQueryData(AUTH_KEY)).toEqual(joinedPlayer);
    });

    it("shows the message for the failed request and keeps the typed values", async () => {
      loginWithCredentialsMock.mockRejectedValueOnce(new NetworkError());

      const state = await submitLogin();

      expect(queryClient.getQueryData(AUTH_KEY)).toEqual(SEEDED_USER);
      expect(state.error).toBe("Network error. Please check your connection and try again.");
      expect(state.values).toEqual({ email: "player@test.com", password: "password" });
    });

    it("shows the credentials message for a 401 LOGIN_INVALID_CREDENTIALS", async () => {
      loginWithCredentialsMock.mockRejectedValueOnce(
        new UnauthorizedError("Unauthorized", {
          success: false,
          error: "LOGIN_INVALID_CREDENTIALS",
          message: "Invalid credentials.",
        }),
      );

      const state = await submitLogin();

      expect(queryClient.getQueryData(AUTH_KEY)).toEqual(SEEDED_USER);
      expect(state.error).toBe("Incorrect email or password.");
    });
  });
});
