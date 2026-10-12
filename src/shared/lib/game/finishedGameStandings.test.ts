// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildExpectedPodiumPlaceholder,
  buildExpectedStandings,
  buildFinishedPlayerResponses,
} from "@/shared/types/game.test-support";
import { buildFinishedGameStandings } from "./finishedGameStandings";

describe("buildFinishedGameStandings", () => {
  const [alice, bob, cara, dan] = buildExpectedStandings();
  const placeholder = buildExpectedPodiumPlaceholder();

  it.each([
    { playerCount: 0, standings: [], podium: [], leaderboard: [] },
    { playerCount: 1, standings: [alice], podium: [alice], leaderboard: [] },
    {
      playerCount: 2,
      standings: [alice, bob],
      podium: [alice, bob, placeholder],
      leaderboard: [],
    },
    {
      playerCount: 3,
      standings: [alice, bob, cara],
      podium: [alice, bob, cara],
      leaderboard: [],
    },
    {
      playerCount: 4,
      standings: [alice, bob, cara, dan],
      podium: [alice, bob, cara],
      leaderboard: [dan],
    },
  ])(
    "should build podium and leaderboard when the game had $playerCount players",
    ({ playerCount, standings, podium, leaderboard }) => {
      const result = buildFinishedGameStandings(
        buildFinishedPlayerResponses().slice(0, playerCount),
      );

      expect(result.standings).toStrictEqual(standings);
      expect(result.podiumData).toStrictEqual(podium);
      expect(result.leaderBoardList).toStrictEqual(leaderboard);
    },
  );

  it("should keep the backend order when positions are out of order", () => {
    const result = buildFinishedGameStandings([
      { playerId: 2, username: "Bob", position: 2, roundsPlayed: 3, roundAverage: 30 },
      { playerId: 1, username: "Alice", position: 1, roundsPlayed: 3, roundAverage: 40 },
    ]);

    expect(result.standings.map((player) => player.id)).toStrictEqual([2, 1]);
    expect(result.standings.map((player) => player.index)).toStrictEqual([1, 0]);
  });
});
