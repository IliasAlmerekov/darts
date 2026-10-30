// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FinishedPlayerResponse } from "@/shared/api/game";
import {
  buildExpectedPodiumPlaceholder,
  buildExpectedStandings,
  buildFinishedPlayerResponses,
} from "@/shared/types/game.test-support";
import { buildFinishedGameStandings } from "./finishedGameStandings";

function buildFinishedPlayer(
  overrides: Partial<FinishedPlayerResponse> = {},
): FinishedPlayerResponse {
  return {
    playerId: 1,
    username: "Anna",
    position: 0,
    placement: 1,
    roundsPlayed: 2,
    roundAverage: 60,
    ...overrides,
  };
}

describe("buildFinishedGameStandings", () => {
  const [alice, bob, cara, dan] = buildExpectedStandings();
  const placeholder = buildExpectedPodiumPlaceholder();

  it.each([
    { playerCount: 0, podium: [], leaderboard: [] },
    { playerCount: 1, podium: [alice], leaderboard: [] },
    { playerCount: 2, podium: [alice, bob, placeholder], leaderboard: [] },
    { playerCount: 3, podium: [alice, bob, cara], leaderboard: [] },
    { playerCount: 4, podium: [alice, bob, cara], leaderboard: [dan] },
  ])(
    "should build podium and leaderboard when the game had $playerCount players",
    ({ playerCount, podium, leaderboard }) => {
      const result = buildFinishedGameStandings(
        buildFinishedPlayerResponses().slice(0, playerCount),
      );

      expect(result).toStrictEqual({ podiumData: podium, leaderBoardList: leaderboard });
    },
  );

  it.each([undefined, null])("should build empty standings when the players are %s", (players) => {
    expect(buildFinishedGameStandings(players)).toStrictEqual({
      podiumData: [],
      leaderBoardList: [],
    });
  });

  it("orders the podium by placement when the winner sat second", () => {
    const result = buildFinishedGameStandings([
      buildFinishedPlayer({ playerId: 2, username: "Bob", position: 0, placement: 2 }),
      buildFinishedPlayer({ playerId: 1, username: "Alice", position: 1, placement: 1 }),
    ]);

    expect(result.podiumData.map((entry) => entry.id)).toStrictEqual([1, 2, 0]);
  });

  it("marks only the third slot of a two-player podium as the podium placeholder", () => {
    const { podiumData } = buildFinishedGameStandings(buildFinishedPlayerResponses().slice(0, 2));

    expect(podiumData.map((entry) => entry.isPlaceholder)).toStrictEqual([
      undefined,
      undefined,
      true,
    ]);
  });

  it("counts the rounds the backend reports as played", () => {
    const { podiumData } = buildFinishedGameStandings([buildFinishedPlayer({ roundsPlayed: 3 })]);

    expect(podiumData[0]?.rounds).toBe(3);
  });

  it("treats a negative round count as no rounds played", () => {
    const { podiumData } = buildFinishedGameStandings([
      buildFinishedPlayer({ roundsPlayed: -1, roundAverage: 45 }),
    ]);

    expect(podiumData[0]).toMatchObject({ rounds: 0, threeDartAverage: "-" });
  });

  it.each([
    { case: "with two decimals", roundsPlayed: 2, roundAverage: 60.6, expected: "60.60" },
    { case: "rounded to two decimals", roundsPlayed: 2, roundAverage: 42.345, expected: "42.34" },
    {
      case: "as 0.00 for rounds and an average of 0",
      roundsPlayed: 3,
      roundAverage: 0,
      expected: "0.00",
    },
    { case: "as a dash for no rounds", roundsPlayed: 0, roundAverage: 0, expected: "-" },
    {
      case: "as a dash for no rounds and an average",
      roundsPlayed: 0,
      roundAverage: 45,
      expected: "-",
    },
  ])("formats the three-dart average $case", ({ roundsPlayed, roundAverage, expected }) => {
    const { podiumData } = buildFinishedGameStandings([
      buildFinishedPlayer({ roundsPlayed, roundAverage }),
    ]);

    expect(podiumData[0]?.threeDartAverage).toBe(expected);
  });
});
