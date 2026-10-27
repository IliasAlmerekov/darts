import type { WinnerPlayerProps } from "@/types";

const NO_AVERAGE = "-";

export function getCompletedRounds(player: WinnerPlayerProps): number {
  if (typeof player.roundCount === "number") {
    return Math.max(player.roundCount, 0);
  }

  if (player.rounds.length === 0) {
    return 0;
  }

  const lastRound = player.rounds[player.rounds.length - 1];
  return lastRound?.throw1 === undefined
    ? Math.max(player.rounds.length - 1, 0)
    : player.rounds.length;
}

/**
 * The backend three-dart average with two decimals, or `-` when the player played no round
 * or the backend sent no average.
 */
export function formatThreeDartAverage(player: WinnerPlayerProps): string {
  if (!player.roundCount || player.scoreAverage === undefined) {
    return NO_AVERAGE;
  }

  return player.scoreAverage.toFixed(2);
}
