import { atom, computed } from "nanostores";
import type { ReadableAtom } from "nanostores";
import type { GameSettings, GameThrowsResponse } from "@/shared/api/game";
import { normalizeGameData } from "../lib/game/gameStateNormalizer";

const gameDataAtom = atom<GameThrowsResponse | null>(null);
const gameSettingsByGameIdAtom = atom<{ gameId: number; settings: GameSettings } | null>(null);

export const $gameData: ReadableAtom<GameThrowsResponse | null> = gameDataAtom;

export const $gameSettings = computed(gameDataAtom, (gameData) => {
  return gameData?.settings ?? null;
});

function setCachedGameSettings(gameId: number, settings: GameSettings): void {
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

export function getCachedGameSettings(gameId: number): GameSettings | null {
  const current = gameSettingsByGameIdAtom.get();
  return current?.gameId === gameId ? current.settings : null;
}

/**
 * Replaces the game data.
 */
export function setGameData(data: GameThrowsResponse | null): void {
  const normalizedData = normalizeGameData(data);
  gameDataAtom.set(normalizedData);
  if (normalizedData !== null) {
    setCachedGameSettings(normalizedData.id, normalizedData.settings);
  }
}

/**
 * Updates only the settings fragment for the current game state.
 */
export function setGameSettings(settings: GameSettings, expectedGameId?: number): void {
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
 * Clears game data and cached settings.
 */
export function resetGameStore(): void {
  gameDataAtom.set(null);
  gameSettingsByGameIdAtom.set(null);
}
