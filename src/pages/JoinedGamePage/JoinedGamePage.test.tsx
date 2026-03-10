// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JoinedGamePage from "./index";

// ── Nanostores ──────────────────────────────────────────────────────────────
const mockUseStore = vi.fn();

vi.mock("@nanostores/react", () => ({
  useStore: (store: unknown) => mockUseStore(store),
}));

vi.mock("@/store/auth", () => ({
  $user: { key: "$user" },
}));

vi.mock("@/store", () => ({
  $currentGameId: { key: "$currentGameId" },
}));

function renderPage(): void {
  render(<JoinedGamePage />);
}

describe("JoinedGamePage", () => {
  beforeEach(() => {
    mockUseStore.mockReset();
    mockUseStore.mockReturnValue(null);
  });

  it("should render the page title", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Spiel beigetreten");
  });

  it("should show generic welcome when user is null", () => {
    renderPage();

    expect(screen.getByText("Willkommen!")).toBeTruthy();
  });

  it("should show username in welcome message when user is authenticated", () => {
    const storeMap = new Map<string, unknown>([
      ["$user", { id: 1, username: "Alice", roles: ["ROLE_PLAYER"], success: true, redirect: "/" }],
      ["$currentGameId", null],
    ]);
    mockUseStore.mockImplementation((store: { key: string }) => storeMap.get(store.key) ?? null);

    renderPage();

    expect(screen.getByText("Willkommen, Alice!")).toBeTruthy();
  });

  it("should not render game id when currentGameId is null", () => {
    renderPage();

    expect(screen.queryByText(/Spiel #/)).toBeNull();
  });

  it("should render game id when currentGameId is set", () => {
    const storeMap = new Map<string, unknown>([
      ["$user", null],
      ["$currentGameId", 42],
    ]);
    mockUseStore.mockImplementation((store: { key: string }) => storeMap.get(store.key) ?? null);

    renderPage();

    expect(screen.getByText("Spiel #42")).toBeTruthy();
  });

  it("should show the waiting indicator", () => {
    renderPage();

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Warte auf den Start des Spiels…")).toBeTruthy();
  });
});
