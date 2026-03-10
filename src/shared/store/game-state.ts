import { atom, computed } from "nanostores";
import type { GameSettingsResponse, GameThrowsResponse, ScoreboardDelta } from "@/types";
import {
  applyGameScoreboardDelta,
  deriveWinnerId,
  normalizeGameData,
} from "../lib/gameStateNormalizer";

export const $gameData = atom<GameThrowsResponse | null>(null);
export const $isLoading = atom<boolean>(false);
export const $error = atom<Error | null>(null);

export const $gameSettings = computed($gameData, (gameData) => {
  return gameData?.settings ?? null;
});

export { deriveWinnerId, normalizeGameData };

/**
 * Replaces the game data and clears any previous error.
 */
export function setGameData(data: GameThrowsResponse | null): void {
  $gameData.set(normalizeGameData(data));
  $error.set(null);
}

/**
 * Updates only the settings fragment for the current game state.
 */
export function setGameSettings(settings: GameSettingsResponse, expectedGameId?: number): void {
  const currentGameData = $gameData.get();
  if (currentGameData === null) {
    return;
  }

  if (typeof expectedGameId === "number" && currentGameData.id !== expectedGameId) {
    return;
  }

  $gameData.set(
    normalizeGameData({
      ...currentGameData,
      settings: {
        startScore: settings.startScore,
        doubleOut: settings.doubleOut,
        tripleOut: settings.tripleOut,
      },
    }),
  );
  $error.set(null);
}

/**
 * Updates only the scoreboard fragment for the current game state.
 */
export function setGameScoreboardDelta(
  scoreboardDelta: ScoreboardDelta,
  expectedGameId?: number,
): GameThrowsResponse | null {
  const currentGameData = $gameData.get();
  if (currentGameData === null) {
    return null;
  }

  if (typeof expectedGameId === "number" && currentGameData.id !== expectedGameId) {
    return null;
  }

  const nextGameData = applyGameScoreboardDelta(currentGameData, scoreboardDelta);

  $gameData.set(nextGameData);
  $error.set(null);
  return nextGameData;
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
