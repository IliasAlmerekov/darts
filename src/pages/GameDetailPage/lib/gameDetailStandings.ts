import {
  buildFinishedGameStandings,
  type FinishedGameStandings,
} from "@/lib/game/finishedGameStandings";
import type { FinishedPlayerResponse } from "@/types";

function isFinishedPlayerList(value: unknown): value is FinishedPlayerResponse[] {
  return Array.isArray(value);
}

/**
 * Builds the standings from the game detail loader data.
 * Throws when the loader returned something other than a player list.
 */
export function buildGameDetailStandings(loaderData: unknown): FinishedGameStandings {
  if (!isFinishedPlayerList(loaderData)) {
    throw new Error("Unexpected loader data format for GameDetailPage");
  }

  return buildFinishedGameStandings(loaderData);
}
