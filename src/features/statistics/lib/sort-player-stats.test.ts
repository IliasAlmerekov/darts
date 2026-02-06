import { describe, expect, it } from "vitest";
import { sortPlayerStats } from "./sort-player-stats";

function player(name: string, scoreAverage: number, playerId: number): BASIC.PlayerProps {
  return {
    id: playerId,
    playerId,
    name,
    scoreAverage,
    gamesPlayed: 0,
  };
}

describe("sortPlayerStats", () => {
  it("sorts alphabetically ignoring case", () => {
    const items = [player("beta", 10, 1), player("Alpha", 20, 2), player("charlie", 5, 3)];

    const sorted = sortPlayerStats(items, "alphabetically");

    expect(sorted.map((item) => item.name)).toEqual(["Alpha", "beta", "charlie"]);
  });

  it("sorts by score in descending order", () => {
    const items = [player("Alpha", 10, 1), player("Beta", 30, 2), player("Charlie", 20, 3)];

    const sorted = sortPlayerStats(items, "score");

    expect(sorted.map((item) => item.name)).toEqual(["Beta", "Charlie", "Alpha"]);
  });
});
