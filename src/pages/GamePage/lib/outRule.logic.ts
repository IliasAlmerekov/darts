import type { GameMode } from "@/types";

export type Ring = "single" | "double" | "triple";

export function isDeadScore(remaining: number, mode: GameMode): boolean {
  return (remaining === 1 && mode !== "single-out") || (remaining === 2 && mode === "triple-out");
}

export function allowsCheckoutWith(ring: Ring, mode: GameMode): boolean {
  return mode === "single-out" || (mode === "double-out" ? ring === "double" : ring === "triple");
}
