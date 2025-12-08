import { atom } from "nanostores";
import type { GameState } from "./types";

// Acts as a cache only; backend remains the source of truth.
export const $currentGame = atom<GameState | null>(null);

export function setCurrentGame(game: GameState): void {
  $currentGame.set(game);
}

export function clearCurrentGame(): void {
  $currentGame.set(null);
}
