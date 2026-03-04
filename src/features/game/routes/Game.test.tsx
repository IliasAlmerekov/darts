// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Game from "./Game";

const useGameLogicMock = vi.fn();

vi.mock("../hooks/useGameLogic", () => ({
  useGameLogic: () => useGameLogicMock(),
}));

vi.mock("../components/Keyboard", () => ({
  Keyboard: () => <div data-testid="keyboard" />,
}));

vi.mock("../components/NumberButton", () => ({
  NumberButton: () => <button type="button">Undo</button>,
}));

vi.mock("../components/game-player-item/GamePlayerItemList", () => ({
  default: () => <div data-testid="active-player-list" />,
}));

vi.mock("../components/game-player-item/FinishedGamePlayerItemList", () => ({
  default: () => <div data-testid="finished-player-list" />,
}));

vi.mock("../components/SettingsOverlay", () => ({
  default: () => null,
}));

vi.mock("@/components/link-button/LinkButton", () => ({
  default: () => null,
}));

vi.mock("@/components/overlay/Overlay", () => ({
  default: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

function buildGameLogicResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gameId: 1,
    gameData: null,
    isLoading: false,
    error: null,
    activePlayers: [],
    finishedPlayers: [],
    activePlayer: null,
    shouldShowFinishOverlay: false,
    isInteractionDisabled: false,
    isUndoDisabled: false,
    isSettingsOpen: false,
    isSavingSettings: false,
    settingsError: null,
    pageError: null,
    isExitOverlayOpen: false,
    handleThrow: vi.fn(),
    handleUndo: vi.fn(),
    handleContinueGame: vi.fn(),
    handleUndoFromOverlay: vi.fn(),
    handleOpenSettings: vi.fn(),
    handleCloseSettings: vi.fn(),
    handleSaveSettings: vi.fn(),
    handleOpenExitOverlay: vi.fn(),
    handleCloseExitOverlay: vi.fn(),
    clearPageError: vi.fn(),
    handleExitGame: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  };
}

describe("Game route errors", () => {
  it("renders missing game identifier error state", () => {
    useGameLogicMock.mockReturnValue(buildGameLogicResult({ gameId: null }));

    render(
      <MemoryRouter>
        <Game />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Game not available")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to start" }).getAttribute("href")).toBe("/start");
  });

  it("renders load error state and retries on click", () => {
    const refetch = vi.fn();
    useGameLogicMock.mockReturnValue(
      buildGameLogicResult({
        gameId: 9,
        error: new Error("Network request failed"),
        refetch,
      }),
    );

    render(
      <MemoryRouter>
        <Game />
      </MemoryRouter>,
    );

    expect(screen.getByText("Could not load game")).toBeTruthy();
    screen.getByRole("button", { name: "Retry" }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows dismissible page error for failed game actions", () => {
    const clearPageError = vi.fn();
    useGameLogicMock.mockReturnValue(
      buildGameLogicResult({
        gameData: {
          id: 2,
          status: "started",
          currentRound: 1,
          activePlayerId: 1,
          currentThrowCount: 0,
          winnerId: null,
          settings: { startScore: 301, doubleOut: false, tripleOut: false },
          players: [],
        },
        pageError: "Could not leave the game. Please try again.",
        clearPageError,
      }),
    );

    render(
      <MemoryRouter>
        <Game />
      </MemoryRouter>,
    );

    expect(screen.getByText("Game action failed")).toBeTruthy();
    screen.getByRole("button", { name: "Dismiss" }).click();
    expect(clearPageError).toHaveBeenCalledTimes(1);
  });
});
