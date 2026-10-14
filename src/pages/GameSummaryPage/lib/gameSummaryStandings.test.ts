// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildExpectedStandings,
  buildFinishedPlayerResponses,
} from "@/shared/types/game.test-support";
import { buildGameSummaryStandings } from "./gameSummaryStandings";

describe("buildGameSummaryStandings", () => {
  it("should build standings from the finished game query data", () => {
    const { standings } = buildGameSummaryStandings(buildFinishedPlayerResponses().slice(0, 2));

    expect(standings).toStrictEqual(buildExpectedStandings().slice(0, 2));
  });

  it("should build empty standings while the query has no data", () => {
    const { standings, leaderBoardList } = buildGameSummaryStandings(undefined);

    expect(standings).toEqual([]);
    expect(leaderBoardList).toEqual([]);
  });
});
