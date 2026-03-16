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

export function shouldAutoFinishGame(
  gameData: GameThrowsResponse | null,
  shouldShowFinishOverlay: boolean,
): boolean {
  if (!gameData || gameData.status === "finished" || shouldShowFinishOverlay) {
    return false;
  }

  const activePlayersCount = gameData.players.filter((player) => player.score > 0).length;
  const finishedPlayersCount = gameData.players.filter((player) => player.score === 0).length;

  return activePlayersCount === 1 && finishedPlayersCount >= 1;
}

export function shouldNavigateToSummary(
  gameData: GameThrowsResponse | null,
  gameId: number | null,
): boolean {
  if (!gameData || gameId === null) {
    return false;
  }

  return gameData.id === gameId && gameData.status === "finished";
}

export function parseGameIdParam(gameIdParam: string | undefined): number | null {
  if (!gameIdParam) {
    return null;
  }

  const parsed = Number(gameIdParam);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

  return !shouldAutoFinishGame(gameData, false);
}
