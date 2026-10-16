// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuthenticatedUser = vi.fn();

vi.mock("@/shared/hooks/useAuthenticatedUser", () => ({
  useAuthenticatedUser: () => mockUseAuthenticatedUser(),
}));

vi.mock("@/shared/api/auth", () => ({
  logout: vi.fn(),
}));

vi.mock("@/shared/api/player", () => ({
  getCurrentGame: vi.fn(),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: vi.fn() },
}));

import { act, fireEvent, render, screen } from "@testing-library/react";
import { onlineManager, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { logout, type AuthenticatedUser } from "@/shared/api/auth";
import { getCurrentGame } from "@/shared/api/player";
import type { CurrentGame } from "@/shared/lib/player/currentGame";
import { ApiError, NetworkError, UnauthorizedError } from "@/shared/api";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { ROUTES } from "@/lib/router/routes";
import { createQueryClient } from "@/shared/query/queryClient";
import { CURRENT_GAME_POLL_INTERVAL_MS } from "@/shared/query/player.queries";
import { $currentGameId, $invitation, setCurrentGameId, setInvitation } from "@/shared/store";
import JoinedGamePage from "./index";

const lobby = (gameId: number): CurrentGame => ({ kind: "lobby", gameId });
const started = (gameId: number): CurrentGame => ({ kind: "started", gameId });
const noCurrentGame: CurrentGame = { kind: "none" };

function buildAuthenticatedUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    success: true,
    roles: ["ROLE_PLAYER"],
    id: 1,
    redirect: "/",
    ...overrides,
  };
}

/** Answers the current-game requests in order; the last answer repeats. */
function respondWithCurrentGames(
  ...responses: [CurrentGame | Error, ...Array<CurrentGame | Error>]
): void {
  let call = 0;
  vi.mocked(getCurrentGame).mockImplementation(() => {
    const response = responses[Math.min(call, responses.length - 1)] ?? responses[0];
    call += 1;
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  });
}

function renderPage(): { unmount: () => void } {
  const router = createMemoryRouter(
    [
      { path: ROUTES.login, element: <p>Login form</p> },
      { path: ROUTES.playerProfile, element: <p>Player profile</p> },
      { path: ROUTES.joined, element: <JoinedGamePage /> },
    ],
    { initialEntries: [ROUTES.joined] },
  );
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

async function advancePolling(times = 1): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(CURRENT_GAME_POLL_INTERVAL_MS * times);
    // Query results reach React through zero-delay timeouts; this one runs after them.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("JoinedGamePage", () => {
  beforeEach(() => {
    // Only the poll interval and the clock are fake, so polling moves only when a test
    // advances it. Zero-delay timers stay real for React and Testing Library.
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    setInvitation(null);
    setCurrentGameId(null);
    vi.mocked(logout).mockReset();
    vi.mocked(clientLogger.error).mockReset();
    vi.mocked(getCurrentGame).mockReset();
    respondWithCurrentGames(lobby(42));
    mockUseAuthenticatedUser.mockReset();
    mockUseAuthenticatedUser.mockReturnValue({ user: null, loading: false, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    onlineManager.setOnline(true);
  });

  it("should render the page title", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Joined game");
  });

  it("should show generic welcome when user is null", () => {
    renderPage();

    expect(screen.getByText("Welcome!")).toBeTruthy();
  });

  it("should show username in welcome message when user is authenticated", () => {
    mockUseAuthenticatedUser.mockReturnValue({
      user: buildAuthenticatedUser({ username: "Alice" }),
      loading: false,
      error: null,
    });

    renderPage();

    expect(screen.getByText("Welcome, Alice!")).toBeTruthy();
  });

  it("should show the spinner until the first answer arrives", async () => {
    vi.mocked(getCurrentGame).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole("status").textContent).toContain("Waiting for the game to start...");
    expect(screen.queryByText(/Game #/)).toBeNull();
    expect(screen.queryByText("The game has started")).toBeNull();
  });

  it("should wait in the lobby and ask for the current game every 3 seconds", async () => {
    renderPage();

    expect(await screen.findByText("Game #42")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Waiting for the game to start...");
    expect(getCurrentGame).toHaveBeenCalledTimes(1);

    await advancePolling(2);

    expect(getCurrentGame).toHaveBeenCalledTimes(3);
    expect(screen.getByText("Game #42")).toBeTruthy();
  });

  it("should show the start and stop polling when the game starts while waiting", async () => {
    respondWithCurrentGames(lobby(42), started(42));
    renderPage();
    await screen.findByText("Game #42");

    await advancePolling();

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("The game has started");
    expect(status.textContent).toContain("Follow your score on the tablet");
    expect(screen.queryByText("Waiting for the game to start...")).toBeNull();

    await advancePolling(3);

    expect(getCurrentGame).toHaveBeenCalledTimes(2);
  });

  it("should show the start without polling when the game has already started on load", async () => {
    respondWithCurrentGames(started(42));
    renderPage();

    expect(await screen.findByText("The game has started")).toBeTruthy();
    expect(screen.getByText("Game #42")).toBeTruthy();

    await advancePolling(2);

    expect(getCurrentGame).toHaveBeenCalledTimes(1);
  });

  it("should tell a removed player and clear the current game when the game is gone", async () => {
    setCurrentGameId(42);
    respondWithCurrentGames(lobby(42), noCurrentGame);
    renderPage();
    await screen.findByText("Game #42");

    await advancePolling();

    expect(screen.getByText("You are no longer in this game")).toBeTruthy();
    expect(screen.queryByText("Game #42")).toBeNull();
    expect($currentGameId.get()).toBeNull();

    await advancePolling(2);
    expect(getCurrentGame).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Go to my profile" }));

    expect(await screen.findByText("Player profile")).toBeTruthy();
  });

  it("should open the player profile when there is no current game on load", async () => {
    respondWithCurrentGames(noCurrentGame);
    renderPage();

    expect(await screen.findByText("Player profile")).toBeTruthy();
    expect(screen.queryByText("You are no longer in this game")).toBeNull();
  });

  it("should follow a changed game id and keep polling", async () => {
    setCurrentGameId(42);
    respondWithCurrentGames(lobby(42), lobby(43));
    renderPage();
    await screen.findByText("Game #42");

    await advancePolling();

    expect(await screen.findByText("Game #43")).toBeTruthy();
    expect(screen.queryByText("Game #42")).toBeNull();
    expect($currentGameId.get()).toBe(43);

    await advancePolling();

    expect(getCurrentGame).toHaveBeenCalledTimes(3);
  });

  it("should drop an invitation for another game when the server moves the player", async () => {
    setInvitation({ gameId: 42, invitationLink: "/invite/42" });
    respondWithCurrentGames(lobby(43));
    renderPage();

    await screen.findByText("Game #43");

    expect($invitation.get()).toBeNull();
    expect($currentGameId.get()).toBe(43);
  });

  it("should show the lost connection after 3 failed requests in a row and hide it on success", async () => {
    const failure = new NetworkError("Failed to fetch");
    respondWithCurrentGames(lobby(42), failure, failure, failure, lobby(42));
    renderPage();
    await screen.findByText("Game #42");

    await advancePolling(2);
    expect(screen.queryByText("Connection lost. Trying again…")).toBeNull();

    await advancePolling();
    expect(screen.getByRole("status").textContent).toContain("Connection lost. Trying again…");

    await advancePolling();
    expect(screen.queryByText("Connection lost. Trying again…")).toBeNull();
    expect(screen.getByText("Game #42")).toBeTruthy();
  });

  it("should show the lost connection while the phone is offline", async () => {
    const failure = new NetworkError("Failed to fetch");
    respondWithCurrentGames(lobby(42), failure);
    renderPage();
    await screen.findByText("Game #42");

    onlineManager.setOnline(false);
    await advancePolling(3);

    expect(getCurrentGame).toHaveBeenCalledTimes(4);
    expect(screen.getByRole("status").textContent).toContain("Connection lost. Trying again…");
  });

  it("should count failures again from zero after a success", async () => {
    const failure = new NetworkError("Failed to fetch");
    respondWithCurrentGames(failure, failure, lobby(42), failure, failure, lobby(42));
    renderPage();

    await advancePolling(4);

    expect(getCurrentGame).toHaveBeenCalledTimes(5);
    expect(screen.queryByText("Connection lost. Trying again…")).toBeNull();
  });

  it("should log a failed request that is not a lost connection", async () => {
    const serverError = new ApiError("Server error", { status: 500 });
    respondWithCurrentGames(serverError);
    renderPage();

    await advancePolling(0);

    expect(clientLogger.error).toHaveBeenCalledWith("player.current-game.fetch.failed", {
      error: serverError,
    });
  });

  it.each([
    ["a lost connection", new NetworkError("Failed to fetch")],
    ["an expired session", new UnauthorizedError("Unauthorized")],
  ])("should not log %s", async (_case, error) => {
    respondWithCurrentGames(error);
    renderPage();

    await advancePolling(2);

    expect(getCurrentGame).toHaveBeenCalledTimes(3);
    expect(clientLogger.error).not.toHaveBeenCalled();
  });

  it("should stop polling when the page closes", async () => {
    const { unmount } = renderPage();
    await screen.findByText("Game #42");

    unmount();
    await advancePolling(2);

    expect(getCurrentGame).toHaveBeenCalledTimes(1);
  });

  it("should open the login page when the player logs out", async () => {
    vi.mocked(logout).mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByText("Login form")).toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("should keep the Waiting room with an error and log out on Retry when logout fails", async () => {
    vi.mocked(logout)
      .mockRejectedValueOnce(new NetworkError("Failed to fetch"))
      .mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Login form")).toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(2);
  });

  it("should show the logout error inside the Waiting room", async () => {
    vi.mocked(logout).mockRejectedValueOnce(new NetworkError("Failed to fetch"));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Joined game");
  });
});
