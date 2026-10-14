// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GameSummaryResponse } from "@/types";
import { createQueryClient } from "./queryClient";
import { gameQueries, getLastFinishedGameId } from "./game.queries";

describe("getLastFinishedGameId", () => {
  it("should return null when no finished game is cached", () => {
    expect(getLastFinishedGameId(createQueryClient())).toBeNull();
  });

  it("should return the highest cached game id even when an older game was written last", () => {
    const client = createQueryClient();
    client.setQueryData(gameQueries.finished(9).queryKey, []);
    client.setQueryData(gameQueries.finished(5).queryKey, []);

    expect(getLastFinishedGameId(client)).toBe(9);
  });

  it("should ignore a finished game that has no data yet", () => {
    const client = createQueryClient();
    client.setQueryData(gameQueries.finished(5).queryKey, []);
    void client.prefetchQuery({
      ...gameQueries.finished(9),
      queryFn: () => new Promise<GameSummaryResponse>(() => {}),
    });

    expect(getLastFinishedGameId(client)).toBe(5);
  });
});
