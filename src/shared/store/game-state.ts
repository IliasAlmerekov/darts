import { atom, computed } from "nanostores";
import type { GameThrowsResponse } from "@/types";

export const $gameData = atom<GameThrowsResponse | null>(null);
export const $isLoading = atom<boolean>(false);
export const $error = atom<Error | null>(null);

export const $gameSettings = computed($gameData, (gameData) => {
  return gameData?.settings ?? null;
});

function deriveActivePlayerId(data: GameThrowsResponse): number | null {
  const hasValidActivePlayerId = data.players.some((player) => player.id === data.activePlayerId);
  if (hasValidActivePlayerId) {
    return data.activePlayerId;
  }

  const activePlayers = data.players.filter((player) => player.isActive === true);
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

  const aliveByScore = data.players.filter((player) => player.score > 0);
  if (aliveByScore.length === 1) {
    return aliveByScore[0]?.id ?? null;
  }

  const activePlayers = data.players.filter((player) => player.isActive === true);
  if (activePlayers.length === 1) {
    return activePlayers[0]?.id ?? null;
  }

  const playersWithOpenPosition = data.players.filter((player) => player.position === 0);
  if (playersWithOpenPosition.length === 1) {
    return playersWithOpenPosition[0]?.id ?? null;
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

/**
 * Replaces the game data and clears any previous error.
 */
export function setGameData(data: GameThrowsResponse | null): void {
  $gameData.set(normalizeGameData(data));
  $error.set(null);
}

/**
 * Sets the loading state for game data requests.
 */
export function setLoading(loading: boolean): void {
  $isLoading.set(loading);
}

/**
 * Stores an error produced while fetching game data.
 */
export function setError(error: Error | null): void {
  $error.set(error);
}

/**
 * Clears game data and resets loading/error flags.
 */
export function resetGameStore(): void {
  $gameData.set(null);
  $isLoading.set(false);
  $error.set(null);
}
