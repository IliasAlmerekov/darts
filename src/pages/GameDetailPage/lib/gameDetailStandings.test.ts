// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildExpectedStandings,
  buildFinishedPlayerResponses,
} from "@/shared/types/game.test-support";
import { buildGameDetailStandings } from "./gameDetailStandings";

describe("buildGameDetailStandings", () => {
  it("should build standings when loader data is a player list", () => {
    const [alice, bob, cara, dan] = buildExpectedStandings();

    const result = buildGameDetailStandings(buildFinishedPlayerResponses());

    expect(result.standings).toStrictEqual([alice, bob, cara, dan]);
    expect(result.podiumData).toStrictEqual([alice, bob, cara]);
    expect(result.leaderBoardList).toStrictEqual([dan]);
  });

  it("should throw when loader data is not a player list", () => {
    expect(() => buildGameDetailStandings(null)).toThrow(
      "Unexpected loader data format for GameDetailPage",
    );
  });
});
