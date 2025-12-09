import { atom } from "nanostores";
import { saveGameSettings } from "@/services/api";

export type SettingsType = {
  gameMode: string;
  points: number;
};

export const $settings = atom<SettingsType>({
  gameMode: "single-out",
  points: 301,
});

export function newSettings(gameMode: string, points: number) {
  $settings.set({
    gameMode,
    points,
  });
}

/**
 * Speichert Settings lokal und optional zum Backend
 * @param gameMode - Der Spielmodus (single-out, double-out, triple-out)
 * @param points - Die Startpunkte
 * @param gameId - Optional: Wenn vorhanden, wird PATCH verwendet, sonst POST
 * @returns Das Game-Response-Objekt vom Backend oder null bei lokalem Update
 */
export async function saveSettings(gameMode: string, points: number, gameId?: number | null) {
  // Lokal speichern
  newSettings(gameMode, points);

  // Zum Backend senden
  const isDoubleOut = gameMode === "double-out";
  const isTripleOut = gameMode === "triple-out";

  try {
    const response = await saveGameSettings(
      {
        startScore: points,
        doubleOut: isDoubleOut,
        tripleOut: isTripleOut,
      },
      gameId,
    );
    return response;
  } catch (error) {
    console.error("Failed to save settings to backend:", error);
    throw error;
  }
}
