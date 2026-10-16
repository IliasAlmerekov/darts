// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRegistrationPage } from "./useRegistrationPage";
import { ROUTES } from "@/lib/router/routes";

const navigateMock = vi.fn();
const useRegistrationMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("./useRegistration", () => ({
  useRegistration: () => useRegistrationMock(),
}));

const player = { success: true, roles: ["ROLE_PLAYER"], id: 1, username: "a", redirect: "/joined" };

function givenRegistration(registered: unknown): void {
  useRegistrationMock.mockReturnValue({
    register: vi.fn(),
    loading: false,
    error: null,
    registered,
  });
}

describe("useRegistrationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show the form before registration", () => {
    givenRegistration(null);
    const { result } = renderHook(() => useRegistrationPage());
    expect(result.current.screen).toEqual({ type: "form" });
  });

  it("should show the joining state after a registration without invitation error", () => {
    givenRegistration({ ...player, gameId: 42 });
    const { result } = renderHook(() => useRegistrationPage());
    expect(result.current.screen).toEqual({ type: "joining" });
  });

  it.each([
    ["GAME_ALREADY_STARTED", "This game has already started"],
    ["GAME_ROOM_FULL", "This game is full"],
    ["GAME_NOT_FOUND", "This game no longer exists"],
    ["GAME_JOIN_NOT_ALLOWED", "This game can no longer be joined"],
  ])("should show the invitation error screen for %s", (code, message) => {
    givenRegistration({ ...player, invitationError: code });
    const { result } = renderHook(() => useRegistrationPage());
    expect(result.current.screen).toEqual({ type: "invitation-error", message });
  });

  it("should navigate to the Player profile from the invitation error screen", () => {
    givenRegistration({ ...player, invitationError: "GAME_ROOM_FULL" });
    const { result } = renderHook(() => useRegistrationPage());
    act(() => result.current.goToPlayerProfile());
    expect(navigateMock).toHaveBeenCalledWith(ROUTES.playerProfile);
  });
});
