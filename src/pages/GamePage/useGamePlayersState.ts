import { useCallback, useEffect, useMemo, useState } from "react";
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
  handleUndo: () => Promise<void>;
  isLoading: boolean;
  isUndoPending: boolean;
  skipFinishOverlay: boolean;
}

interface UseGamePlayersStateResult {
  activePlayer: GameThrowsResponse["players"][number] | null;
  activePlayers: UIPlayer[];
  finishedPlayers: UIPlayer[];
  handleContinueGame: () => void;
  handleUndoFromOverlay: () => Promise<void>;
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
  isUndoPending,
  skipFinishOverlay,
}: UseGamePlayersStateOptions): UseGamePlayersStateResult {
  const [dismissedZeroScorePlayerIds, setDismissedZeroScorePlayerIds] = useState<number[]>([]);

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
        isUndoPending,
        skipFinishOverlay,
      }),
    [dismissedZeroScorePlayerIds, error, gameData, isLoading, isUndoPending, skipFinishOverlay],
  );

  useEffect(() => {
    setDismissedZeroScorePlayerIds((previousIds) =>
      filterDismissedPlayerIds(previousIds, zeroScorePlayerIds),
    );
  }, [zeroScorePlayerIds]);

  useEffect(() => {
    setDismissedZeroScorePlayerIds([]);
  }, [gameId]);

  const handleContinueGame = useCallback(() => {
    setDismissedZeroScorePlayerIds((previousIds) =>
      appendDismissedPlayerIds(previousIds, zeroScorePlayerIds),
    );
  }, [zeroScorePlayerIds]);

  const handleUndoFromOverlay = useCallback(async () => {
    await handleUndo();
    setDismissedZeroScorePlayerIds((previousIds) =>
      appendDismissedPlayerIds(previousIds, zeroScorePlayerIds),
    );
  }, [handleUndo, zeroScorePlayerIds]);

  return {
    activePlayer,
    activePlayers,
    finishedPlayers,
    handleContinueGame,
    handleUndoFromOverlay,
    isInteractionDisabled,
    isUndoDisabled,
    shouldShowFinishOverlay,
  };
}
