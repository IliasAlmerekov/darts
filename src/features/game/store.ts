import { atom, computed } from "nanostores";
import type { GameThrowsResponse } from "@/types";

// Core game state from server
export const $gameData = atom<GameThrowsResponse | null>(null);
export const $isLoading = atom<boolean>(false);
export const $error = atom<Error | null>(null);

// Derived state
export const $activePlayer = computed($gameData, (gameData) => {
  if (!gameData) return null;
  return gameData.players.find((p) => p.id === gameData.activePlayerId) ?? null;
});

export const $currentRound = computed($gameData, (gameData) => {
  return gameData?.currentRound ?? 1;
});

export const $currentThrowCount = computed($gameData, (gameData) => {
  return gameData?.currentThrowCount ?? 0;
});

export const $isGameFinished = computed($gameData, (gameData) => {
  return gameData?.status === "finished";
});

export const $winnerId = computed($gameData, (gameData) => {
  return gameData?.winnerId ?? null;
});

export const $gameSettings = computed($gameData, (gameData) => {
  return gameData?.settings ?? null;
});

// Players mapped to UI format
export const $playersForUI = computed($gameData, (gameData) => {
  if (!gameData) return [];
  const currentRound = gameData.currentRound;

  return gameData.players.map((player, index) => ({
    id: player.id,
    name: player.name,
    score: player.score,
    isActive: player.isActive,
    index,
    rounds: (player.roundHistory as BASIC.Round[]) || [],
    isPlaying: player.position === 0,
    isBust: player.isBust,
    throwCount: player.throwsInCurrentRound,
    position: player.position,
    currentRound,
  }));
});

// Actions
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
