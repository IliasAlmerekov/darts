// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import type { GameThrowsResponse } from "@/shared/api/game";
import { useGamePlayersState } from "./useGamePlayersState";

function buildGame(gameId: number, aliceScore: number): GameThrowsResponse {
  return buildGameThrowsResponse({
    id: gameId,
    activePlayerId: 2,
    settings: { startScore: 301, doubleOut: false, tripleOut: false },
    players: [
      buildBackendPlayer({
        id: 1,
        name: "Alice",
        score: aliceScore,
        position: aliceScore === 0 ? 1 : null,
      }),
      buildBackendPlayer({ id: 2, name: "Bob", score: 301, isActive: true, position: null }),
      buildBackendPlayer({ id: 3, name: "Cara", score: 301, position: null }),
    ],
  });
}

interface HookProps {
  gameData: GameThrowsResponse;
  gameId: number;
}

function renderPlayersState(initialProps: HookProps) {
  return renderHook(
    ({ gameData, gameId }: HookProps) =>
      useGamePlayersState({
        canThrow: true,
        canUndo: true,
        isSyncing: false,
        error: null,
        gameData,
        gameId,
        handleUndo: vi.fn(),
        isLoading: false,
        skipFinishOverlay: false,
      }),
    { initialProps },
  );
}

describe("useGamePlayersState", () => {
  it("shows the finish overlay again when an undone player finishes a second time", () => {
    const { result, rerender } = renderPlayersState({ gameData: buildGame(1, 0), gameId: 1 });
    expect(result.current.shouldShowFinishOverlay).toBe(true);

    act(() => {
      result.current.handleContinueGame();
    });
    expect(result.current.shouldShowFinishOverlay).toBe(false);

    rerender({ gameData: buildGame(1, 20), gameId: 1 });
    expect(result.current.shouldShowFinishOverlay).toBe(false);

    rerender({ gameData: buildGame(1, 0), gameId: 1 });
    expect(result.current.shouldShowFinishOverlay).toBe(true);
  });

  it("forgets the dismissed players when another game opens", () => {
    const { result, rerender } = renderPlayersState({ gameData: buildGame(1, 0), gameId: 1 });

    act(() => {
      result.current.handleContinueGame();
    });
    expect(result.current.shouldShowFinishOverlay).toBe(false);

    rerender({ gameData: buildGame(2, 0), gameId: 2 });
    expect(result.current.shouldShowFinishOverlay).toBe(true);
  });
});
