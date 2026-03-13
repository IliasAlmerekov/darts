import type { WinnerPlayerProps } from "@/types";

export const DEFAULT_ROUND_AVERAGE_START_SCORE = 301;

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

export function formatRoundAverage(
  player: WinnerPlayerProps,
  startScore = DEFAULT_ROUND_AVERAGE_START_SCORE,
): string {
  const completedRounds = getCompletedRounds(player);

  if (completedRounds === 0) {
    return (0).toFixed(2);
  }

  const averageScoreRaw = player.scoreAverage ?? (startScore - player.score) / completedRounds;
  return averageScoreRaw.toFixed(2);
}
