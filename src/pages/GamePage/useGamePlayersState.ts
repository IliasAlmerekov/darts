import { useCallback, useMemo, useState } from "react";
import type { GameThrowsResponse, UIPlayer } from "@/types";
import {
  appendDismissedPlayerIds,
  buildGamePlayersDerivedState,
  filterDismissedPlayerIds,
} from "./lib/gamePlayersState.logic";

interface UseGamePlayersStateOptions {
  error: Error | null;
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  handleUndo: () => void;
  isLoading: boolean;
  canThrow: boolean;
  canUndo: boolean;
  skipFinishOverlay: boolean;
}

interface DismissedPlayers {
  gameId: number | null;
  ids: number[];
}

const NO_DISMISSED_PLAYERS: number[] = [];

interface UseGamePlayersStateResult {
  activePlayer: GameThrowsResponse["players"][number] | null;
  activePlayers: UIPlayer[];
  finishedPlayers: UIPlayer[];
  handleContinueGame: () => void;
  handleUndoFromOverlay: () => void;
  isInteractionDisabled: boolean;
  isUndoDisabled: boolean;
  shouldShowFinishOverlay: boolean;
}

export function useGamePlayersState({
  error,
  gameData,
  gameId,
  handleUndo,
  isLoading,
  canThrow,
  canUndo,
  skipFinishOverlay,
}: UseGamePlayersStateOptions): UseGamePlayersStateResult {
  const [dismissed, setDismissed] = useState<DismissedPlayers>({ gameId, ids: [] });
  // Dismissals belong to one game, so another game starts with none.
  const dismissedZeroScorePlayerIds =
    dismissed.gameId === gameId ? dismissed.ids : NO_DISMISSED_PLAYERS;

  const {
    activePlayer,
    activePlayers,
    finishedPlayers,
    isInteractionDisabled,
    isUndoDisabled,
    shouldShowFinishOverlay,
    zeroScorePlayerIds,
  } = useMemo(
    () =>
      buildGamePlayersDerivedState({
        dismissedZeroScorePlayerIds,
        gameData,
        hasError: !!error,
        isLoading,
        canThrow,
        canUndo,
        skipFinishOverlay,
      }),
    [canThrow, canUndo, dismissedZeroScorePlayerIds, error, gameData, isLoading, skipFinishOverlay],
  );

  // A player who leaves zero through undo is no longer dismissed, so finishing again shows the
  // overlay again. State adjusts during render, as React documents for derived resets.
  const stillDismissedIds = filterDismissedPlayerIds(
    dismissedZeroScorePlayerIds,
    zeroScorePlayerIds,
  );
  if (stillDismissedIds !== dismissedZeroScorePlayerIds) {
    setDismissed({ gameId, ids: stillDismissedIds });
  }

  const dismissFinishedPlayers = useCallback((): void => {
    setDismissed((previous) => ({
      gameId,
      ids: appendDismissedPlayerIds(
        previous.gameId === gameId ? previous.ids : NO_DISMISSED_PLAYERS,
        zeroScorePlayerIds,
      ),
    }));
  }, [gameId, zeroScorePlayerIds]);

  const handleUndoFromOverlay = useCallback((): void => {
    handleUndo();
    dismissFinishedPlayers();
  }, [dismissFinishedPlayers, handleUndo]);

  return {
    activePlayer,
    activePlayers,
    finishedPlayers,
    handleContinueGame: dismissFinishedPlayers,
    handleUndoFromOverlay,
    isInteractionDisabled,
    isUndoDisabled,
    shouldShowFinishOverlay,
  };
}
