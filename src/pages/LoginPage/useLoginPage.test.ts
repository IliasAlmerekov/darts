// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLoginPage } from "./useLoginPage";
import { ROUTES } from "@/lib/router/routes";

const navigateMock = vi.fn();
const useLoginMock = vi.fn();
const useAuthenticatedUserMock = vi.fn();
const getActiveGameIdMock = vi.fn();
const useLocationMock = vi.fn();
const assignMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => useLocationMock(),
  };
});

vi.mock("./useLogin", () => ({
  useLogin: () => useLoginMock(),
}));

vi.mock("@/shared/hooks/useAuthenticatedUser", () => ({
  useAuthenticatedUser: () => useAuthenticatedUserMock(),
}));

vi.mock("@/shared/store", () => ({
  getActiveGameId: () => getActiveGameIdMock(),
}));

const loggedInPlayer = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 23,
  username: "Ton Eighty",
  redirect: "http://localhost:3000/joined",
};
const joinedPlayer = { ...loggedInPlayer, gameId: 42 };

function givenAuthCheck(user: unknown, loading = false): void {
  useAuthenticatedUserMock.mockReturnValue({ user, loading, error: null });
}

describe("useLoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: assignMock,
      },
    });
    useLoginMock.mockReturnValue({
      login: vi.fn(),
      loading: false,
      error: null,
    });
    givenAuthCheck(null);
    getActiveGameIdMock.mockReturnValue(null);
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
    getActiveGameIdMock.mockReturnValue(99);

    renderHook(() => useLoginPage());

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(ROUTES.joined);
    });
    expect(navigateMock).not.toHaveBeenCalledWith(ROUTES.start(99));
  });

  it("sends an admin with a stored game to that game's start page", async () => {
    givenAuthCheck({ success: true, roles: ["ROLE_ADMIN"], id: 1, redirect: "/start" });
    getActiveGameIdMock.mockReturnValue(99);

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
    givenAuthCheck({ ...loggedInPlayer, invitationError: "GAME_ROOM_FULL" });

    const { result } = renderHook(() => useLoginPage());

    expect(result.current.screen).toEqual({
      type: "invitation-error",
      invitationError: "GAME_ROOM_FULL",
    });
    await waitFor(() => {
      expect(navigateMock).not.toHaveBeenCalled();
    });

    act(() => {
      result.current.goToPlayerProfile();
    });

    expect(navigateMock).toHaveBeenCalledWith(ROUTES.playerProfile);
  });
});
