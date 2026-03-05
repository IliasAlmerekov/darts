import type { SortMethod } from "@/shared/ui/sort-tabs";
import type { PlayerProps } from "@/types";

function getSafeAverage(player: PlayerProps): number {
  return typeof player.scoreAverage === "number" ? player.scoreAverage : 0;
}

export function sortPlayerStats(items: PlayerProps[], sortMethod: SortMethod): PlayerProps[] {
  const indexedItems = items.map((item, index) => ({ item, index }));

  indexedItems.sort((left, right) => {
    if (sortMethod === "alphabetically") {
      const byName = left.item.name.localeCompare(right.item.name, undefined, {
        sensitivity: "base",
        numeric: true,
      });

      return byName !== 0 ? byName : left.index - right.index;
    }

    const byScore = getSafeAverage(right.item) - getSafeAverage(left.item);
    if (byScore !== 0) {
      return byScore;
    }

    return left.item.name.localeCompare(right.item.name, undefined, {
      sensitivity: "base",
      numeric: true,
    });
  });

  return indexedItems.map(({ item }) => item);
}
