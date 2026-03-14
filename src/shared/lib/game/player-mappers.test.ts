// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getFinishedPlayers, mapPlayersToUI } from "./player-mappers";
import type { GameThrowsResponse } from "@/types";

function buildPlayer(
  overrides: Partial<GameThrowsResponse["players"][number]>,
): GameThrowsResponse["players"][number] {
  return {
    id: 1,
    name: "Player 1",
    score: 301,
    isActive: false,
    isBust: false,
    position: 1,
    throwsInCurrentRound: 0,
    currentRoundThrows: [],
    roundHistory: [],
    ...overrides,
  };
}

describe("player-mappers", () => {
  it("should map backend players to UI rounds including current round when round data is present", () => {
    const players = [
      buildPlayer({
        id: 10,
        name: "Alice",
        score: 200,
        isActive: true,
        roundHistory: [{ throws: [{ value: 20 }, { value: 5, isBust: true }] }],
        currentRoundThrows: [{ value: 10 }, { value: 15 }, { value: 5 }],
      }),
    ];

    const mapped = mapPlayersToUI(players);

    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      id: 10,
      name: "Alice",
      score: 200,
      isActive: true,
      isPlaying: true,
      throwCount: 0,
    });
    expect(mapped[0]?.rounds).toHaveLength(2);
    expect(mapped[0]?.rounds[0]).toMatchObject({
      throw1: 20,
      throw2: 5,
      throw2IsBust: true,
      isRoundBust: true,
    });
    expect(mapped[0]?.rounds[0]).not.toHaveProperty("throw1IsBust");
    expect(mapped[0]?.rounds[0]).not.toHaveProperty("throw3");
    expect(mapped[0]?.rounds[1]).toMatchObject({
      throw1: 10,
      throw2: 15,
      throw3: 5,
    });
    expect(mapped[0]?.rounds[1]).not.toHaveProperty("throw1IsBust");
  });

  it("should return finished players sorted by position with null positions at the end when positions are mixed", () => {
    const mappedPlayers = mapPlayersToUI([
      buildPlayer({ id: 1, score: 0, position: 3 }),
      buildPlayer({ id: 2, score: 0, position: null }),
      buildPlayer({ id: 3, score: 0, position: 1 }),
      buildPlayer({ id: 4, score: 50, position: 2 }),
    ]);

    const finished = getFinishedPlayers(mappedPlayers);

    expect(finished.map((p) => p.id)).toEqual([3, 1, 2]);
  });

  it("should use backend round numbers to align throw display for current round when rounds are sparse", () => {
    const players = [
      buildPlayer({
        id: 22,
        name: "Alex2",
        score: 26,
        isActive: false,
        roundHistory: [
          { round: 1, throws: [{ value: 20 }] },
          { round: 4, throws: [{ value: 25, isBust: true }] },
        ],
        currentRoundThrows: [],
      }),
    ];

    const mapped = mapPlayersToUI(players, 4);
    expect(mapped[0]?.rounds[3]).toMatchObject({
      throw1: 25,
      throw1IsBust: true,
    });
  });
});
