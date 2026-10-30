import {
  buildFinishedGameStandings,
  type FinishedGameStandings,
} from "@/lib/game/finishedGameStandings";
import type { FinishedPlayerResponse } from "@/shared/api/game";

/**
 * Builds the standings from the finished game query data.
 * The query has no data until the first response arrives, which gives empty standings.
 */
export function buildGameSummaryStandings(
  summary: FinishedPlayerResponse[] | undefined,
): FinishedGameStandings {
  return buildFinishedGameStandings(summary ?? []);
}
