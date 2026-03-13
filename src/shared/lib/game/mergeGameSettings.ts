import type { GameSettingsResponse, GameThrowsResponse } from "@/types";

export function mergeGameSettings(
  gameData: GameThrowsResponse | null,
  settings: GameSettingsResponse,
  expectedGameId?: number,
): GameThrowsResponse | null {
  if (gameData === null) {
    return null;
  }

  if (typeof expectedGameId === "number" && gameData.id !== expectedGameId) {
    return null;
  }

  return {
    ...gameData,
    settings: {
      startScore: settings.startScore,
      doubleOut: settings.doubleOut,
      tripleOut: settings.tripleOut,
    },
  };
}
