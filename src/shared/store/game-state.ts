import { atom } from "nanostores";
import type { ReadableAtom } from "nanostores";
import type { GameSettings, GameThrowsResponse } from "@/shared/api/game";
import { toRoster } from "@/lib/game/roster";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { writeRoster } from "@/shared/query/roster";

const gameDataAtom = atom<GameThrowsResponse | null>(null);
export const $gameData: ReadableAtom<GameThrowsResponse | null> = gameDataAtom;

export function acceptGame(game: GameThrowsResponse | null): void {
  gameDataAtom.set(game);
  if (game === null) return;
  const settingsKey = gameQueries.settings(game.id).queryKey;
  void queryClient.cancelQueries({ queryKey: settingsKey });
  queryClient.setQueryData(settingsKey, game.settings);
  if (game.status === "lobby") {
    writeRoster(game.id, toRoster(game.players));
  }
}

export function acceptGameSettings(gameId: number, settings: GameSettings): void {
  const queryKey = gameQueries.settings(gameId).queryKey;
  void queryClient.cancelQueries({ queryKey });
  queryClient.setQueryData(queryKey, settings);
  const current = gameDataAtom.get();
  if (current?.id === gameId) gameDataAtom.set({ ...current, settings });
}

export function resetGameStore(): void {
  gameDataAtom.set(null);
}
