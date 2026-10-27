import type { PlayerProps } from "@/types";

function getSafeAverage(player: PlayerProps): number {
  return typeof player.scoreAverage === "number" ? player.scoreAverage : 0;
}

export function sortPlayerStatsByAverage(items: PlayerProps[]): PlayerProps[] {
  return [...items].sort((left, right) => {
    const byScore = getSafeAverage(right) - getSafeAverage(left);
    if (byScore !== 0) {
      return byScore;
    }

    return left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
      numeric: true,
    });
  });
}
