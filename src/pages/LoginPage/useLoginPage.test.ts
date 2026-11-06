// @vitest-environment jsdom
import { createElement, startTransition, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
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

const loggedInPlayer: AuthenticatedUser = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 23,
  username: "Ton Eighty",
  redirect: "http://localhost:3000/playerprofile",
};
const joinedPlayer: AuthenticatedUser = {
  ...loggedInPlayer,
  redirect: "http://localhost:3000/joined",
  gameId: 42,
};
const admin: AuthenticatedUser = {
  success: true,
  roles: ["ROLE_ADMIN", "ROLE_PLAYER"],
  id: 1,
  redirect: "http://localhost:3000/start",
};

const AUTH_KEY = authQueries.me().queryKey;

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

/** Answers the Remembered login check from the cache, as after a finished check. */
function givenAuthCheck(user: AuthenticatedUser | null): void {
  queryClient.setQueryData(AUTH_KEY, user);
}

function renderLoginPage(): { current: ReturnType<typeof useLoginPage> } {
  return renderHook(() => useLoginPage(), { wrapper }).result;
}

async function submitLogin(): Promise<ReturnType<typeof useLoginPage>> {
  const result = renderLoginPage();

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
    getAuthenticatedUserMock.mockReturnValueOnce(new Promise(() => undefined));

    const result = renderLoginPage();

    expect(result.current.screen).toEqual({ type: "checking" });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("shows the form when the auth check finds no login", async () => {
    getAuthenticatedUserMock.mockResolvedValueOnce(null);

    const result = renderLoginPage();

    await waitFor(() => {
      expect(result.current.screen).toEqual({ type: "form" });
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("keeps the form hidden for a remembered login", () => {
    givenAuthCheck(joinedPlayer);

    const result = renderLoginPage();

    expect(result.current.screen).toEqual({ type: "checking" });
  });

  // The one redirect case here: the hook reads the source route from the location state.
  // Every other destination lives in the table of src/shared/query/postAuth.test.ts.
  it("sends a remembered admin to the source route from the location state", async () => {
    givenAuthCheck(admin);
    useLocationMock.mockReturnValue({
      pathname: "/",
      search: "",
      hash: "",
      key: "test",
      state: { from: "/statistics" },
    });

    renderLoginPage();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/statistics");
    });
  });

  it("shows the invitation error instead of navigating", async () => {
    givenAuthCheck({ ...loggedInPlayer, invitationError: "GAME_ROOM_FULL" });

    const result = renderLoginPage();

    expect(result.current.screen).toEqual({
      type: "invitation-error",
      message: "This game is full",
    });
    await waitFor(() => {
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  it("drops the handled invitation error on Go to player profile", () => {
    givenAuthCheck({ ...loggedInPlayer, invitationError: "GAME_ROOM_FULL" });
    const result = renderLoginPage();

    act(() => {
      result.current.goToPlayerProfile();
    });

    expect(queryClient.getQueryData(AUTH_KEY)).toEqual({
      ...loggedInPlayer,
      redirect: ROUTES.playerProfile,
    });
  });

  describe("form login", () => {
    beforeEach(() => {
      givenAuthCheck(null);
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

    it("stores the user with the invitation error", async () => {
      const rejectedInvitation: AuthenticatedUser = {
        ...loggedInPlayer,
        invitationError: "GAME_ALREADY_STARTED",
      };
      loginWithCredentialsMock.mockResolvedValueOnce(rejectedInvitation);

      const state = await submitLogin();

      expect(queryClient.getQueryData(AUTH_KEY)).toEqual(rejectedInvitation);
      expect(state.error).toBeNull();
    });

    it("keeps the logged-in user when a pending Remembered login check answers late with no user", async () => {
      // A fresh cached user would let the check skip its request, so nothing would be in flight.
      queryClient.removeQueries({ queryKey: AUTH_KEY });
      let answerSessionCheck: (user: null) => void = () => {};
      getAuthenticatedUserMock.mockReturnValueOnce(
        new Promise((resolve) => {
          answerSessionCheck = resolve;
        }),
      );
      const sessionCheck = queryClient.prefetchQuery(authQueries.me());
      expect(getAuthenticatedUserMock).toHaveBeenCalledOnce();
      loginWithCredentialsMock.mockResolvedValueOnce(joinedPlayer);

      await submitLogin();
      answerSessionCheck(null);
      await sessionCheck;

      expect(queryClient.getQueryData(AUTH_KEY)).toEqual(joinedPlayer);
    });

    it("shows the message for the failed request and keeps the typed values", async () => {
      loginWithCredentialsMock.mockRejectedValueOnce(new NetworkError());

      const state = await submitLogin();

      expect(queryClient.getQueryData(AUTH_KEY)).toBeNull();
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

      expect(queryClient.getQueryData(AUTH_KEY)).toBeNull();
      expect(state.error).toBe("Incorrect email or password.");
    });
  });
});
