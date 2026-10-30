import type { GameThrowsResponse } from "@/shared/api/game";

export function deriveActivePlayerId(data: GameThrowsResponse): number | null {
  const activePlayers = data.players.filter((player) => player.isActive === true);
  if (activePlayers.length === 1 && activePlayers[0]?.id !== data.activePlayerId) {
    return activePlayers[0]?.id ?? null;
  }

  const hasValidActivePlayerId = data.players.some((player) => player.id === data.activePlayerId);
  if (hasValidActivePlayerId) {
    return data.activePlayerId;
  }

  if (activePlayers.length === 1) {
    return activePlayers[0]?.id ?? null;
  }

  const playersWithCurrentThrows = data.players.filter((player) => {
    const currentRoundThrowCount = player.currentRoundThrows?.length ?? 0;
    const syncedThrowCount = Math.max(currentRoundThrowCount, player.throwsInCurrentRound ?? 0);
    return syncedThrowCount > 0;
  });
  if (playersWithCurrentThrows.length === 1) {
    return playersWithCurrentThrows[0]?.id ?? null;
  }

  if (data.status === "started") {
    const playersStillInGame = data.players.filter((player) => player.score > 0);
    if (playersStillInGame.length === 1) {
      return playersStillInGame[0]?.id ?? null;
    }
  }

  return null;
}

function normalizeActiveFlags(
  players: GameThrowsResponse["players"],
  activePlayerId: number | null,
): GameThrowsResponse["players"] {
  if (activePlayerId === null) {
    return players;
  }

  const areFlagsAlreadyNormalized = players.every(
    (player) => player.isActive === (player.id === activePlayerId),
  );
  if (areFlagsAlreadyNormalized) {
    return players;
  }

  return players.map((player) => ({
    ...player,
    isActive: player.id === activePlayerId,
  }));
}

export function deriveWinnerId(data: GameThrowsResponse): number | null {
  if (data.status !== "finished") {
    return data.winnerId ?? null;
  }

  if (data.winnerId !== null) {
    return data.winnerId;
  }

  const firstPlacedPlayers = data.players.filter((player) => player.placement === 1);
  if (firstPlacedPlayers.length === 1) {
    return firstPlacedPlayers[0]?.id ?? null;
  }

  const aliveByScore = data.players.filter((player) => player.score > 0);
  if (aliveByScore.length === 1) {
    return aliveByScore[0]?.id ?? null;
  }

  const activePlayers = data.players.filter((player) => player.isActive === true);
  if (activePlayers.length === 1) {
    return activePlayers[0]?.id ?? null;
  }

  return null;
}

export function normalizeGameData(data: GameThrowsResponse | null): GameThrowsResponse | null {
  if (data === null) {
    return null;
  }

  const derivedWinnerId = deriveWinnerId(data);
  const derivedActivePlayerId = deriveActivePlayerId(data);
  const normalizedPlayers = normalizeActiveFlags(data.players, derivedActivePlayerId);

  if (
    derivedWinnerId === data.winnerId &&
    derivedActivePlayerId === data.activePlayerId &&
    normalizedPlayers === data.players
  ) {
    return data;
  }

  return {
    ...data,
    activePlayerId: derivedActivePlayerId,
    winnerId: derivedWinnerId,
    players: normalizedPlayers,
  };
}
