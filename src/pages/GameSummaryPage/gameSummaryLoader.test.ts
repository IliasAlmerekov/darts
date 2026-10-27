// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeLoaderArgs } from "@/test/loaderArgs";
import { queryClient as appQueryClient } from "@/shared/query/queryClient";
import { gameQueries } from "@/shared/query/game.queries";
import { gameSummaryLoader } from "./gameSummaryLoader";

const getFinishedGameMock = vi.fn();
const getGameSettingsMock = vi.fn();
const getTabletGameMock = vi.fn();

vi.mock("@/shared/api/game", () => ({
  getFinishedGame: (...args: unknown[]) => getFinishedGameMock(...args),
  getGameSettings: (...args: unknown[]) => getGameSettingsMock(...args),
  getTabletGame: (...args: unknown[]) => getTabletGameMock(...args),
}));

function finishedPlayer(playerId: number, username: string) {
  return { playerId, username, position: 1, placement: 1, roundsPlayed: 5, roundAverage: 60.2 };
}

// The setup the useGameSummaryPage suite ran before these tests: the summary is the last
// finished game.
beforeEach(() => {
  vi.clearAllMocks();
  getTabletGameMock.mockResolvedValue({ game: null, lastFinishedGameId: 42 });
  getFinishedGameMock.mockResolvedValue([]);
});

describe("gameSummaryLoader", () => {
  beforeEach(() => {
    appQueryClient.clear();
  });

  it("should fill the finishedGame cache before the page renders", async () => {
    getFinishedGameMock.mockResolvedValueOnce([finishedPlayer(3, "Carol")]);

    await gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id: "42" }));

    expect(appQueryClient.getQueryData(gameQueries.finished(42).queryKey)).toEqual([
      finishedPlayer(3, "Carol"),
    ]);
  });

  it("should not request the game settings, which the summary does not read", async () => {
    getFinishedGameMock.mockResolvedValueOnce([finishedPlayer(3, "Carol")]);

    await gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id: "42" }));

    expect(getGameSettingsMock).not.toHaveBeenCalled();
  });

  it("should not fetch again when the game page already seeded the cache", async () => {
    appQueryClient.setQueryData(gameQueries.finished(42).queryKey, [finishedPlayer(3, "Carol")]);

    await gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id: "42" }));

    expect(getFinishedGameMock).not.toHaveBeenCalled();
  });

  it("should not throw when the fetch fails, so the page can show its Retry action", async () => {
    getFinishedGameMock.mockRejectedValueOnce(new Error("network down"));

    await expect(
      gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id: "42" })),
    ).resolves.toBeNull();
  });

  it.each(["abc", "0", "-5", "1e3"])(
    "should throw a 404 response and send no request for the invalid game id %s",
    async (id) => {
      await expect(
        gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id })),
      ).rejects.toMatchObject({ status: 404 });

      expect(getTabletGameMock).not.toHaveBeenCalled();
      expect(getFinishedGameMock).not.toHaveBeenCalled();
      expect(getGameSettingsMock).not.toHaveBeenCalled();
    },
  );
});
