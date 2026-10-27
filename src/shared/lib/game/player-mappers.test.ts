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
    isGuest: false,
    position: 1,
    placement: null,
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
        roundHistory: [
          {
            throws: [
              { value: 20, isDouble: false, isTriple: false, isBust: false },
              { value: 5, isBust: true, isDouble: false, isTriple: false },
            ],
          },
        ],
        currentRoundThrows: [
          { value: 10, isDouble: false, isTriple: false, isBust: false },
          { value: 15, isDouble: false, isTriple: false, isBust: false },
          { value: 5, isDouble: false, isTriple: false, isBust: false },
        ],
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
    expect(mapped[0]?.rounds[0]).toHaveProperty("throw1IsBust", false);
    expect(mapped[0]?.rounds[0]).not.toHaveProperty("throw3");
    expect(mapped[0]?.rounds[1]).toMatchObject({
      throw1: 10,
      throw2: 15,
      throw3: 5,
    });
    expect(mapped[0]?.rounds[1]).toHaveProperty("throw1IsBust", false);
  });

  it("should return finished players sorted by placement independently of turn order", () => {
    const mappedPlayers = mapPlayersToUI([
      buildPlayer({ id: 1, score: 0, position: 0, placement: 3 }),
      buildPlayer({ id: 2, score: 0, position: 1, placement: 2 }),
      buildPlayer({ id: 3, score: 0, position: 2, placement: 1 }),
      buildPlayer({ id: 4, score: 50, position: 3, placement: null }),
    ]);

    const finished = getFinishedPlayers(mappedPlayers);

    expect(finished.map((p) => p.id)).toEqual([3, 2, 1]);
    expect(finished.map((p) => p.placement)).toEqual([1, 2, 3]);
    expect(finished.map((p) => p.position)).toEqual([2, 1, 0]);
  });

  it("should map isDouble and isTriple flags from backend throws to UIRound fields", () => {
    const players = [
      buildPlayer({
        id: 5,
        name: "Bob",
        score: 150,
        isActive: false,
        roundHistory: [
          {
            throws: [
              { value: 10, isDouble: true, isTriple: false, isBust: false },
              { value: 20, isTriple: true, isDouble: false, isBust: false },
              { value: 5, isDouble: false, isTriple: false, isBust: false },
            ],
          },
        ],
        currentRoundThrows: [],
      }),
    ];

    const mapped = mapPlayersToUI(players);

    expect(mapped[0]?.rounds[0]).toMatchObject({
      throw1: 10,
      throw1IsDouble: true,
      throw2: 20,
      throw2IsTriple: true,
      throw3: 5,
    });
    expect(mapped[0]?.rounds[0]).not.toHaveProperty("throw1IsTriple");
    expect(mapped[0]?.rounds[0]).not.toHaveProperty("throw2IsDouble");
    expect(mapped[0]?.rounds[0]).not.toHaveProperty("throw3IsDouble");
    expect(mapped[0]?.rounds[0]).not.toHaveProperty("throw3IsTriple");
  });

  it("should use backend round numbers to align throw display for current round when rounds are sparse", () => {
    const players = [
      buildPlayer({
        id: 22,
        name: "Alex2",
        score: 26,
        isActive: false,
        roundHistory: [
          { round: 1, throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          { round: 4, throws: [{ value: 25, isBust: true, isDouble: false, isTriple: false }] },
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
