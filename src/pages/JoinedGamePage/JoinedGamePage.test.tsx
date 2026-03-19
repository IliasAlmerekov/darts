// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/shared/api/auth";
import JoinedGamePage from "./index";

// ── Nanostores ──────────────────────────────────────────────────────────────
const mockUseStore = vi.fn();
const mockUseRoomStream = vi.fn();

vi.mock("@nanostores/react", () => ({
  useStore: (store: unknown) => mockUseStore(store),
}));

vi.mock("@/shared/store", () => ({
  $user: { key: "$user" },
  $currentGameId: { key: "$currentGameId" },
}));

vi.mock("@/shared/hooks/useRoomStream", () => ({
  useRoomStream: (gameId: number | null) => mockUseRoomStream(gameId),
}));

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
  render(<JoinedGamePage />);
}

describe("JoinedGamePage", () => {
  beforeEach(() => {
    mockUseStore.mockReset();
    mockUseStore.mockReturnValue(null);
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
    const storeMap = new Map<string, unknown>([
      ["$user", buildAuthenticatedUser({ username: "Alice" })],
      ["$currentGameId", null],
    ]);
    mockUseStore.mockImplementation((store: { key: string }) => storeMap.get(store.key) ?? null);

    renderPage();

    expect(screen.getByText("Welcome, Alice!")).toBeTruthy();
  });

  it("should not render game id when currentGameId is null", () => {
    renderPage();

    expect(screen.queryByText(/Game #/)).toBeNull();
  });

  it("should render game id when currentGameId is set", () => {
    const storeMap = new Map<string, unknown>([
      ["$user", null],
      ["$currentGameId", 42],
    ]);
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
    const storeMap = new Map<string, unknown>([
      ["$user", null],
      ["$currentGameId", 42],
    ]);
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
});
