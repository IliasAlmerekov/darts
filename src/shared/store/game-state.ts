import { atom, computed } from "nanostores";
import type { GameThrowsResponse } from "@/types";

export const $gameData = atom<GameThrowsResponse | null>(null);
export const $isLoading = atom<boolean>(false);
export const $error = atom<Error | null>(null);

export const $gameSettings = computed($gameData, (gameData) => {
  return gameData?.settings ?? null;
});

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
  if (derivedWinnerId === data.winnerId) {
    return data;
  }

  return {
    ...data,
    winnerId: derivedWinnerId,
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
