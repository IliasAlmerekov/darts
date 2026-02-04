import { atom, computed } from "nanostores";
import type { GameThrowsResponse } from "@/features/game/api";

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
/**
 * Replaces the game data and clears any previous error.
 */
export function setGameData(data: GameThrowsResponse | null): void {
  $gameData.set(data);
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
