// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { PlayerProps } from "@/types";
import { sortPlayerStatsByAverage } from "./sort-player-stats";

function player(name: string, scoreAverage: number, playerId: number): PlayerProps {
  return {
    id: playerId,
    playerId,
    name,
    scoreAverage,
    gamesPlayed: 0,
  };
}

describe("sortPlayerStatsByAverage", () => {
  it("should sort by score in descending order", () => {
    const items = [player("Alpha", 10, 1), player("Beta", 30, 2), player("Charlie", 20, 3)];

    const sorted = sortPlayerStatsByAverage(items);

    expect(sorted.map((item) => item.name)).toEqual(["Beta", "Charlie", "Alpha"]);
  });

  it("should break average ties by name", () => {
    const items = [player("charlie", 10, 1), player("Alpha", 10, 2)];

    const sorted = sortPlayerStatsByAverage(items);

    expect(sorted.map((item) => item.name)).toEqual(["Alpha", "charlie"]);
  });
});
