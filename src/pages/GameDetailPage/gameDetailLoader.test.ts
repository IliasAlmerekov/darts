// @vitest-environment node

vi.mock("@/shared/api/game", () => ({
  getFinishedGame: (...args: unknown[]) => getFinishedGameMock(...args),
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeLoaderArgs } from "@/test/loaderArgs";
import type { FinishedPlayerResponse } from "@/types";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient as appQueryClient } from "@/shared/query/queryClient";
import { gameDetailLoader } from "./gameDetailLoader";

const getFinishedGameMock = vi.fn();

function buildFinishedPlayer(
  overrides: Partial<FinishedPlayerResponse> = {},
): FinishedPlayerResponse {
  return {
    playerId: 1,
    username: "Player",
    position: 1,
    placement: 1,
    roundsPlayed: 4,
    roundAverage: 50,
    ...overrides,
  };
}

describe("gameDetailLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appQueryClient.clear();
  });

  it("should fill the finishedGame query when the route id is valid", async () => {
    const players = [buildFinishedPlayer({ username: "Alice", roundAverage: 75 })];
    getFinishedGameMock.mockResolvedValue(players);

    await gameDetailLoader(makeLoaderArgs(new Request("http://localhost/"), { id: "42" }));

    expect(getFinishedGameMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    expect(appQueryClient.getQueryData(gameQueries.finished(42).queryKey)).toEqual(players);
  });

  it("should make no request when the summary page already cached the finished game", async () => {
    appQueryClient.setQueryData(gameQueries.finished(42).queryKey, [buildFinishedPlayer()]);

    await gameDetailLoader(makeLoaderArgs(new Request("http://localhost/"), { id: "42" }));

    expect(getFinishedGameMock).not.toHaveBeenCalled();
  });

  it.each(["abc", "0", "-5", "1e3", "1.5"])(
    "should throw a 404 Response and send no request when the route id is %s",
    async (id) => {
      await expect(
        gameDetailLoader(makeLoaderArgs(new Request("http://localhost/"), { id })),
      ).rejects.toMatchObject({ status: 404 });

      expect(getFinishedGameMock).not.toHaveBeenCalled();
    },
  );

  it("should reject when the fetch fails, so the route error boundary shows it", async () => {
    getFinishedGameMock.mockRejectedValueOnce(new Error("network down"));

    await expect(
      gameDetailLoader(makeLoaderArgs(new Request("http://localhost/"), { id: "42" })),
    ).rejects.toThrow("network down");
  });
});
