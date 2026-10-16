// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Nanostores ──────────────────────────────────────────────────────────────
const mockUseStore = vi.fn();
const mockUseRoomStream = vi.fn();
const mockUseAuthenticatedUser = vi.fn();

vi.mock("@nanostores/react", () => ({
  useStore: (store: unknown) => mockUseStore(store),
}));

vi.mock("@/shared/store", () => ({
  $currentGameId: { key: "$currentGameId" },
}));

vi.mock("@/shared/hooks/useAuthenticatedUser", () => ({
  useAuthenticatedUser: () => mockUseAuthenticatedUser(),
}));

vi.mock("@/shared/api/auth", () => ({
  logout: vi.fn(),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: vi.fn() },
}));

vi.mock("@/shared/hooks/useRoomStream", () => ({
  useRoomStream: (gameId: number | null) => mockUseRoomStream(gameId),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { logout, type AuthenticatedUser } from "@/shared/api/auth";
import { NetworkError } from "@/shared/api";
import { ROUTES } from "@/lib/router/routes";
import JoinedGamePage from "./index";

function buildAuthenticatedUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    success: true,
    roles: ["ROLE_PLAYER"],
    id: 1,
    redirect: "/",
    ...overrides,
  };
}

function renderPage(): void {
  const router = createMemoryRouter(
    [
      { path: ROUTES.login, element: <p>Login form</p> },
      { path: ROUTES.joined, element: <JoinedGamePage /> },
    ],
    { initialEntries: [ROUTES.joined] },
  );
  render(<RouterProvider router={router} />);
}

describe("JoinedGamePage", () => {
  beforeEach(() => {
    vi.mocked(logout).mockReset();
    mockUseStore.mockReset();
    mockUseStore.mockReturnValue(null);
    mockUseAuthenticatedUser.mockReset();
    mockUseAuthenticatedUser.mockReturnValue({ user: null, loading: false, error: null });
    mockUseRoomStream.mockReset();
    mockUseRoomStream.mockReturnValue({
      event: null,
      error: null,
      isConnected: false,
    });
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

  it("should not render game id when currentGameId is null", () => {
    renderPage();

    expect(screen.queryByText(/Game #/)).toBeNull();
  });

  it("should render game id when currentGameId is set", () => {
    const storeMap = new Map<string, unknown>([["$currentGameId", 42]]);
    mockUseStore.mockImplementation((store: { key: string }) => storeMap.get(store.key) ?? null);

    renderPage();

    expect(screen.getByText("Game #42")).toBeTruthy();
  });

  it("should show the waiting indicator", () => {
    renderPage();

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Waiting for the game to start...")).toBeTruthy();
  });

  it("should show started message and hide waiting indicator when game-started event arrives", () => {
    const storeMap = new Map<string, unknown>([["$currentGameId", 42]]);
    mockUseStore.mockImplementation((store: { key: string }) => storeMap.get(store.key) ?? null);
    mockUseRoomStream.mockReturnValue({
      event: { type: "game-started", data: null },
      error: null,
      isConnected: true,
    });

    renderPage();

    expect(screen.getByText("Game has started.")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("Waiting for the game to start...")).toBeNull();
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
