// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildExpectedStandings,
  buildFinishedPlayerResponses,
} from "@/shared/types/game.test-support";
import { buildGameDetailStandings } from "./gameDetailStandings";

describe("buildGameDetailStandings", () => {
  it("should build standings when the finished game has players", () => {
    const [alice, bob, cara, dan] = buildExpectedStandings();

    const result = buildGameDetailStandings(buildFinishedPlayerResponses());

    expect(result.standings).toStrictEqual([alice, bob, cara, dan]);
    expect(result.podiumData).toStrictEqual([alice, bob, cara]);
    expect(result.leaderBoardList).toStrictEqual([dan]);
  });

  it("should build empty standings while the finished game has no data", () => {
    expect(buildGameDetailStandings(undefined)).toStrictEqual({
      standings: [],
      podiumData: expect.any(Array),
      leaderBoardList: [],
    });
  });
});
