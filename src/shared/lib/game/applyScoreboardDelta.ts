import { deriveActivePlayerId, deriveWinnerId, normalizeActiveFlags } from "./gameStateNormalizer";
import type { GameThrowsResponse, ScoreboardDelta } from "@/shared/api/game";

export function applyScoreboardDelta(
  currentGameData: GameThrowsResponse,
  scoreboardDelta: ScoreboardDelta,
): GameThrowsResponse {
  const changedPlayerById = new Map(
    scoreboardDelta.changedPlayers.map((playerDelta) => [playerDelta.playerId, playerDelta]),
  );

  const patchedPlayers = currentGameData.players.map((player) => {
    const playerDelta = changedPlayerById.get(player.id);
    if (!playerDelta) {
      return player;
    }

    return {
      ...player,
      score: playerDelta.score,
      position: playerDelta.position === undefined ? player.position : playerDelta.position,
      placement: playerDelta.placement === undefined ? player.placement : playerDelta.placement,
      isActive: playerDelta.isActive,
      isBust: typeof playerDelta.isBust === "boolean" ? playerDelta.isBust : player.isBust,
    };
  });

  const gameDataWithPatchedScoreboard = {
    ...currentGameData,
    players: patchedPlayers,
    currentRound: scoreboardDelta.currentRound,
    status: scoreboardDelta.status,
    winnerId: scoreboardDelta.winnerId,
  };
  const activePlayerFromDelta = patchedPlayers.find((player) => player.isActive)?.id ?? null;
  const activePlayerId =
    activePlayerFromDelta ?? deriveActivePlayerId(gameDataWithPatchedScoreboard);
  const patchedGameData = {
    ...gameDataWithPatchedScoreboard,
    activePlayerId,
    winnerId: deriveWinnerId(gameDataWithPatchedScoreboard),
    players: normalizeActiveFlags(patchedPlayers, activePlayerId),
  };
  const activePlayer = patchedGameData.players.find(
    (player) => player.id === patchedGameData.activePlayerId,
  );

  return {
    ...patchedGameData,
    currentThrowCount: activePlayer
      ? Math.max(activePlayer.currentRoundThrows.length, activePlayer.throwsInCurrentRound)
      : gameDataWithPatchedScoreboard.currentThrowCount,
  };
}
