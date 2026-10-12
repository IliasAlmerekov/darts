// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildExpectedStandings,
  buildFinishedPlayerResponses,
} from "@/shared/types/game.test-support";
import { buildGameSummaryStandings } from "./gameSummaryStandings";

describe("buildGameSummaryStandings", () => {
  const players = buildFinishedPlayerResponses();
  const [alice, bob, cara] = buildExpectedStandings();

  it("should prefer navigation state over store and server", () => {
    const result = buildGameSummaryStandings({
      fromNavigation: players.slice(0, 1),
      fromStore: players.slice(0, 2),
      fromServer: players.slice(0, 3),
    });

    expect(result.standings).toStrictEqual([alice]);
  });

  it("should use the store when navigation state is absent", () => {
    const result = buildGameSummaryStandings({
      fromNavigation: null,
      fromStore: players.slice(0, 2),
      fromServer: players.slice(0, 3),
    });

    expect(result.standings).toStrictEqual([alice, bob]);
  });

  it("should use the server response when navigation state and store are absent", () => {
    const result = buildGameSummaryStandings({
      fromNavigation: null,
      fromStore: null,
      fromServer: players.slice(0, 3),
    });

    expect(result.standings).toStrictEqual([alice, bob, cara]);
  });

  it("should return empty standings when the server response is still empty", () => {
    const result = buildGameSummaryStandings({
      fromNavigation: null,
      fromStore: null,
      fromServer: [],
    });

    expect(result).toStrictEqual({ standings: [], podiumData: [], leaderBoardList: [] });
  });
});
