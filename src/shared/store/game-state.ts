import { atom, computed } from "nanostores";
import type { ReadableAtom } from "nanostores";
import type { GameSettingsResponse, GameThrowsResponse, ScoreboardDelta } from "@/types";
import { applyGameScoreboardDelta, normalizeGameData } from "../lib/game/gameStateNormalizer";

const gameDataAtom = atom<GameThrowsResponse | null>(null);
const isLoadingAtom = atom<boolean>(false);
const errorAtom = atom<Error | null>(null);
const gameSettingsByGameIdAtom = atom<{ gameId: number; settings: GameSettingsResponse } | null>(
  null,
);

export const $gameData: ReadableAtom<GameThrowsResponse | null> = gameDataAtom;
export const $isLoading: ReadableAtom<boolean> = isLoadingAtom;
export const $error: ReadableAtom<Error | null> = errorAtom;

export const $gameSettings = computed(gameDataAtom, (gameData) => {
  return gameData?.settings ?? null;
});

function setCachedGameSettings(gameId: number, settings: GameSettingsResponse): void {
  const current = gameSettingsByGameIdAtom.get();
  const isUnchanged =
    current?.gameId === gameId &&
    current.settings.startScore === settings.startScore &&
    current.settings.doubleOut === settings.doubleOut &&
    current.settings.tripleOut === settings.tripleOut;

  if (isUnchanged) {
    return;
  }

  gameSettingsByGameIdAtom.set({ gameId, settings });
}

export function getCachedGameSettings(gameId: number): GameSettingsResponse | null {
  const current = gameSettingsByGameIdAtom.get();
  return current?.gameId === gameId ? current.settings : null;
}

/**
 * Replaces the game data and clears any previous error.
 */
export function setGameData(data: GameThrowsResponse | null): void {
  const normalizedData = normalizeGameData(data);
  gameDataAtom.set(normalizedData);
  if (normalizedData !== null) {
    setCachedGameSettings(normalizedData.id, normalizedData.settings);
  }
  errorAtom.set(null);
}

/**
 * Updates only the settings fragment for the current game state.
 */
export function setGameSettings(settings: GameSettingsResponse, expectedGameId?: number): void {
  const currentGameData = gameDataAtom.get();
  const cacheTargetGameId =
    typeof expectedGameId === "number" ? expectedGameId : currentGameData?.id;

  if (typeof cacheTargetGameId === "number") {
    setCachedGameSettings(cacheTargetGameId, settings);
  }

  if (currentGameData === null) {
    return;
  }

  if (typeof expectedGameId === "number" && currentGameData.id !== expectedGameId) {
    return;
  }

  gameDataAtom.set({
    ...currentGameData,
    settings: {
      startScore: settings.startScore,
      doubleOut: settings.doubleOut,
      tripleOut: settings.tripleOut,
    },
  });
}

/**
 * Updates only the scoreboard fragment for the current game state.
 */
export function setGameScoreboardDelta(
  scoreboardDelta: ScoreboardDelta,
  expectedGameId?: number,
): void {
  const currentGameData = gameDataAtom.get();
  if (currentGameData === null) {
    return;
  }

  if (typeof expectedGameId === "number" && currentGameData.id !== expectedGameId) {
    return;
  }

  const nextGameData = applyGameScoreboardDelta(currentGameData, scoreboardDelta);

  gameDataAtom.set(nextGameData);
}

/**
 * Sets the loading state for game data requests.
 */
export function setLoading(loading: boolean): void {
  isLoadingAtom.set(loading);
}

/**
 * Stores an error produced while fetching game data.
 */
export function setError(error: Error | null): void {
  errorAtom.set(error);
}

/**
 * Clears game data and resets loading/error flags.
 */
export function resetGameStore(): void {
  gameDataAtom.set(null);
  isLoadingAtom.set(false);
  errorAtom.set(null);
  gameSettingsByGameIdAtom.set(null);
}
