import type { GameMode, UpdateGameSettingsPayload } from "@/types";

export const GAME_MODE_OPTIONS = [
  { label: "Single-out", id: "single-out" },
  { label: "Double-out", id: "double-out" },
  { label: "Triple-out", id: "triple-out" },
] as const satisfies ReadonlyArray<{ label: string; id: GameMode }>;

export const POINTS_OPTIONS = [
  { label: "101", id: 101 },
  { label: "201", id: 201 },
  { label: "301", id: 301 },
  { label: "401", id: 401 },
  { label: "501", id: 501 },
] as const;

type StartScore = (typeof POINTS_OPTIONS)[number]["id"];

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

export function isStartScore(id: string | number): id is StartScore {
  return POINTS_OPTIONS.some((option) => option.id === id);
}
