import {
  buildFinishedGameStandings,
  type FinishedGameStandings,
} from "@/lib/game/finishedGameStandings";
import type { FinishedPlayerResponse } from "@/shared/api/game";

/**
 * Builds the standings from the finished game query data. Render-flow hooks may not import
 * the mapper itself (docs/convention/api.md, Mappers), so the page hook calls it through here.
 */
export function buildGameDetailStandings(
  players: FinishedPlayerResponse[] | undefined,
): FinishedGameStandings {
  return buildFinishedGameStandings(players);
}
