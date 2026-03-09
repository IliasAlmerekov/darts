import { useCallback, useEffect, useMemo, useState } from "react";
import { getFinishedPlayers, mapPlayersToUI } from "@/lib/player-mappers";
import type { GameThrowsResponse, UIPlayer } from "@/types";
import {
  areAllPlayersAtStartScore,
  calculateShouldShowFinishOverlay,
  getZeroScorePlayerIds,
} from "./gameLogic.helpers";

interface UseGamePlayersStateOptions {
  error: Error | null;
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  handleUndo: () => Promise<void>;
  isLoading: boolean;
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

function appendDismissedPlayers(previousIds: number[], zeroScorePlayerIds: number[]): number[] {
  return Array.from(new Set([...previousIds, ...zeroScorePlayerIds]));
}

export function useGamePlayersState({
  error,
  gameData,
  gameId,
  handleUndo,
  isLoading,
  skipFinishOverlay,
}: UseGamePlayersStateOptions): UseGamePlayersStateResult {
  const [dismissedZeroScorePlayerIds, setDismissedZeroScorePlayerIds] = useState<number[]>([]);

  const playerUI = useMemo(
    () => mapPlayersToUI(gameData?.players ?? [], gameData?.currentRound),
    [gameData?.currentRound, gameData?.players],
  );
  const finishedPlayers = useMemo(() => getFinishedPlayers(playerUI), [playerUI]);
  const activePlayers = useMemo(() => playerUI.filter((player) => player.score > 0), [playerUI]);

  const activePlayer = useMemo(() => {
    if (!gameData) {
      return null;
    }

    return gameData.players.find((player) => player.id === gameData.activePlayerId) ?? null;
  }, [gameData]);

  const zeroScorePlayerIds = useMemo(() => getZeroScorePlayerIds(playerUI), [playerUI]);

  const shouldShowFinishOverlay = useMemo(
    () =>
      calculateShouldShowFinishOverlay({
        gameData,
        dismissedZeroScorePlayerIds,
        skipFinishOverlay,
        zeroScorePlayerIds,
      }),
    [dismissedZeroScorePlayerIds, gameData, skipFinishOverlay, zeroScorePlayerIds],
  );

  const isInteractionDisabled = isLoading || !!error || !gameData || shouldShowFinishOverlay;
  const isUndoDisabled =
    isLoading ||
    !!error ||
    !gameData ||
    shouldShowFinishOverlay ||
    areAllPlayersAtStartScore(gameData);

  useEffect(() => {
    setDismissedZeroScorePlayerIds((previousIds) =>
      previousIds.filter((id) => zeroScorePlayerIds.includes(id)),
    );
  }, [zeroScorePlayerIds]);

  useEffect(() => {
    setDismissedZeroScorePlayerIds([]);
  }, [gameId]);

  const handleContinueGame = useCallback(() => {
    setDismissedZeroScorePlayerIds((previousIds) =>
      appendDismissedPlayers(previousIds, zeroScorePlayerIds),
    );
  }, [zeroScorePlayerIds]);

  const handleUndoFromOverlay = useCallback(async () => {
    await handleUndo();
    setDismissedZeroScorePlayerIds((previousIds) =>
      appendDismissedPlayers(previousIds, zeroScorePlayerIds),
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
