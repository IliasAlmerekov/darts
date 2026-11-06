// @vitest-environment jsdom
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/shared/api/auth", () => ({
  registerUser: (...args: unknown[]) => registerUserMock(...args),
  getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { warn: vi.fn(), error: vi.fn() },
}));

import { startTransition, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
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
const registerUserMock = vi.fn();
const getAuthenticatedUserMock = vi.fn();

const AUTH_KEY = authQueries.me().queryKey;

const player: AuthenticatedUser = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 1,
  username: "a",
  redirect: "/playerprofile",
};

const joinedPlayer: AuthenticatedUser = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 23,
  username: "Ton Eighty",
  redirect: "/joined",
  gameId: 42,
};

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderRegistrationPage(): { current: ReturnType<typeof useRegistrationPage> } {
  return renderHook(() => useRegistrationPage(), { wrapper }).result;
}

async function register(
  username = "john",
  email = "john@example.com",
  password = "Password123!",
): Promise<{ current: ReturnType<typeof useRegistrationPage> }> {
  const result = renderRegistrationPage();

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
    // The session check has finished and found no login.
    queryClient.setQueryData(AUTH_KEY, null);
  });

  it("should show the form to a guest", () => {
    const result = renderRegistrationPage();

    expect(result.current.screen).toEqual({ type: "form" });
  });

  it("should show the login check while the session check runs", () => {
    queryClient.clear();
    getAuthenticatedUserMock.mockReturnValueOnce(new Promise(() => undefined));

    const result = renderRegistrationPage();

    expect(result.current.screen).toEqual({ type: "checking" });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  // The one redirect case here: the page hook redirects through useAuthRedirect. Every
  // destination lives in the table of src/shared/query/postAuth.test.ts.
  it("should show the login check to a remembered user and send them away", async () => {
    queryClient.setQueryData(AUTH_KEY, joinedPlayer);

    const result = renderRegistrationPage();

    expect(result.current.screen).toEqual({ type: "checking" });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(ROUTES.joined);
    });
  });

  it("should show the joining state after a registration without invitation error", async () => {
    registerUserMock.mockResolvedValueOnce(joinedPlayer);

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

  it("should drop the handled invitation error on Go to player profile", async () => {
    registerUserMock.mockResolvedValueOnce({ ...player, invitationError: "GAME_ROOM_FULL" });
    const result = await register();

    act(() => result.current.goToPlayerProfile());

    expect(queryClient.getQueryData(AUTH_KEY)).toEqual({
      ...player,
      redirect: ROUTES.playerProfile,
    });
  });

  it("should show the invitation error screen after a reload from the cached session user", () => {
    const rejected: AuthenticatedUser = { ...player, invitationError: "GAME_ROOM_FULL" };
    queryClient.setQueryData(AUTH_KEY, rejected);

    const result = renderRegistrationPage();

    expect(result.current.screen).toEqual({
      type: "invitation-error",
      message: "This game is full",
    });
    expect(navigateMock).not.toHaveBeenCalled();
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
    expect(result.current.screen).toEqual({ type: "form" });
    // `registerUser` logs its own failures.
    expect(vi.mocked(clientLogger.error)).not.toHaveBeenCalled();
  });

  it("should store the game id and cache the user when registration joins a game", async () => {
    registerUserMock.mockResolvedValueOnce(joinedPlayer);

    await register();

    expect(getActiveGameId()).toBe(42);
    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(joinedPlayer);
  });

  it("should keep the registered user when a pending session check answers late with no user", async () => {
    queryClient.clear();
    let answerSessionCheck: (user: null) => void = () => {};
    getAuthenticatedUserMock.mockReturnValueOnce(
      new Promise((resolve) => {
        answerSessionCheck = resolve;
      }),
    );
    const sessionCheck = queryClient.prefetchQuery(authQueries.me());
    registerUserMock.mockResolvedValueOnce(joinedPlayer);

    await register();
    answerSessionCheck(null);
    await sessionCheck;

    expect(queryClient.getQueryData(AUTH_KEY)).toEqual(joinedPlayer);
  });
});
