import type { GameThrowsResponse, UIPlayer } from "@/types";

interface FinishOverlayVisibilityOptions {
  gameData: GameThrowsResponse | null;
  dismissedZeroScorePlayerIds: number[];
  skipFinishOverlay: boolean;
  zeroScorePlayerIds: number[];
}

export function areAllPlayersAtStartScore(gameData: GameThrowsResponse | null): boolean {
  if (!gameData) {
    return true;
  }

  return gameData.players.every((player) => player.score === gameData.settings.startScore);
}

/**
 * True when an unfinished game has one active player left and at least one finished. The server
 * finishes the game at that point, so the page shows no finish overlay and takes no throw.
 */
export function isLastActivePlayerLeft(gameData: GameThrowsResponse | null): boolean {
  if (!gameData || gameData.status === "finished") {
    return false;
  }

  const activePlayersCount = gameData.players.filter((player) => player.score > 0).length;
  const finishedPlayersCount = gameData.players.filter((player) => player.score === 0).length;

  return activePlayersCount === 1 && finishedPlayersCount >= 1;
}

export function getZeroScorePlayerIds(players: UIPlayer[]): number[] {
  return players.filter((player) => player.score === 0).map((player) => player.id);
}

export function calculateShouldShowFinishOverlay({
  gameData,
  dismissedZeroScorePlayerIds,
  skipFinishOverlay,
  zeroScorePlayerIds,
}: FinishOverlayVisibilityOptions): boolean {
  if (skipFinishOverlay) {
    return false;
  }

  const hasZeroScore = zeroScorePlayerIds.length > 0;
  const hasUndismissedPlayer = zeroScorePlayerIds.some(
    (id) => !dismissedZeroScorePlayerIds.includes(id),
  );

  if (!hasZeroScore || !hasUndismissedPlayer || gameData?.status === "finished") {
    return false;
  }

  return !isLastActivePlayerLeft(gameData);
}
