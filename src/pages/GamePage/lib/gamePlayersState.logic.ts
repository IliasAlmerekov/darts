import { getFinishedPlayers, mapPlayersToUI } from "@/lib/game/player-mappers";
import type { GameThrowsResponse, UIPlayer } from "@/types";
import {
  hasThrowHistory,
  calculateShouldShowFinishOverlay,
  getZeroScorePlayerIds,
} from "./gameLogic.helpers";

interface BuildGamePlayersStateOptions {
  dismissedZeroScorePlayerIds: number[];
  gameData: GameThrowsResponse | null;
  hasError: boolean;
  isLoading: boolean;
  /** The game session takes a throw now (not reloading, queue not full). */
  canThrow: boolean;
  /** The game session takes an undo now (not reloading). */
  canUndo: boolean;
  skipFinishOverlay: boolean;
}

interface GamePlayersDerivedState {
  activePlayer: GameThrowsResponse["players"][number] | null;
  activePlayers: UIPlayer[];
  finishedPlayers: UIPlayer[];
  isInteractionDisabled: boolean;
  isUndoDisabled: boolean;
  shouldShowFinishOverlay: boolean;
  zeroScorePlayerIds: number[];
}

export function appendDismissedPlayerIds(
  previousIds: number[],
  zeroScorePlayerIds: number[],
): number[] {
  return Array.from(new Set([...previousIds, ...zeroScorePlayerIds]));
}

export function filterDismissedPlayerIds(
  previousIds: number[],
  zeroScorePlayerIds: number[],
): number[] {
  const nextIds = previousIds.filter((id) => zeroScorePlayerIds.includes(id));

  if (
    nextIds.length === previousIds.length &&
    nextIds.every((id, index) => id === previousIds[index])
  ) {
    return previousIds;
  }

  return nextIds;
}

export function buildGamePlayersDerivedState({
  dismissedZeroScorePlayerIds,
  gameData,
  hasError,
  isLoading,
  canThrow,
  canUndo,
  skipFinishOverlay,
}: BuildGamePlayersStateOptions): GamePlayersDerivedState {
  const playerUI = mapPlayersToUI(gameData?.players ?? [], gameData?.currentRound);
  const finishedPlayers = getFinishedPlayers(playerUI);
  const activePlayers = playerUI.filter((player) => player.score > 0);
  const activePlayer =
    gameData?.players.find((player) => player.id === gameData.activePlayerId) ?? null;
  const zeroScorePlayerIds = getZeroScorePlayerIds(playerUI);
  const shouldShowFinishOverlay = calculateShouldShowFinishOverlay({
    gameData,
    dismissedZeroScorePlayerIds,
    skipFinishOverlay,
    zeroScorePlayerIds,
  });
  const isInteractionDisabled =
    isLoading || hasError || !gameData || shouldShowFinishOverlay || !canThrow;
  const isUndoDisabled =
    isLoading ||
    hasError ||
    !gameData ||
    shouldShowFinishOverlay ||
    !canUndo ||
    !hasThrowHistory(gameData);

  return {
    activePlayer,
    activePlayers,
    finishedPlayers,
    isInteractionDisabled,
    isUndoDisabled,
    shouldShowFinishOverlay,
    zeroScorePlayerIds,
  };
}
