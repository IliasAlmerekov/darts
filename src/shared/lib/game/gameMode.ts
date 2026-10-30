import type { UpdateGameSettingsPayload } from "@/shared/api/game";
import type { GameMode } from "@/types";

/** Start score of a new game until the admin picks another one. */
export const DEFAULT_START_SCORE = 301;

export const GAME_MODE_OPTIONS = [
  { label: "Single-out", id: "single-out" },
  { label: "Double-out", id: "double-out" },
  { label: "Triple-out", id: "triple-out" },
] as const satisfies ReadonlyArray<{ label: string; id: GameMode }>;

export function resolveGameMode(doubleOut: boolean, tripleOut: boolean): GameMode {
  if (doubleOut) return "double-out";
  if (tripleOut) return "triple-out";
  return "single-out";
}

export function toGameModeFlags(
  mode: GameMode,
): Required<Pick<UpdateGameSettingsPayload, "doubleOut" | "tripleOut">> {
  return { doubleOut: mode === "double-out", tripleOut: mode === "triple-out" };
}

export function isGameMode(id: string | number): id is GameMode {
  return GAME_MODE_OPTIONS.some((option) => option.id === id);
}
