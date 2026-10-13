import {
  buildFinishedGameStandings,
  type FinishedGameStandings,
} from "@/lib/game/finishedGameStandings";
import type { FinishedPlayerResponse } from "@/types";

interface GameSummarySources {
  fromNavigation: FinishedPlayerResponse[] | null;
  fromStore: FinishedPlayerResponse[] | null;
  fromServer: FinishedPlayerResponse[];
}

/**
 * Builds the standings from the first available summary source: navigation state,
 * then the last finished game in the store, then the server response.
 */
export function buildGameSummaryStandings(sources: GameSummarySources): FinishedGameStandings {
  return buildFinishedGameStandings(
    sources.fromNavigation ?? sources.fromStore ?? sources.fromServer,
  );
}
