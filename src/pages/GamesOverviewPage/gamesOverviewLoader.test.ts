// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeLoaderArgs } from "@/test/loaderArgs";
import { buildFinishedGame } from "@/shared/types/game.test-support";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { queryClient as appQueryClient } from "@/shared/query/queryClient";
import { statsQueries } from "@/shared/query/statistics.queries";
import { gamesOverviewLoader } from "./gamesOverviewLoader";

const getGamesOverviewMock = vi.fn();

vi.mock("@/shared/api/statistics", () => ({
  getGamesOverview: (...args: unknown[]) => getGamesOverviewMock(...args),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const ALICE_GAME = buildFinishedGame({
  id: 1,
  winnerRounds: 12,
  winnerName: "Alice",
  playersCount: 4,
  date: "2024-01-15T00:00:00Z",
});
const BOB_GAME = buildFinishedGame({
  id: 2,
  winnerRounds: 8,
  winnerName: "Bob",
  playersCount: 3,
  date: "2024-01-10T00:00:00Z",
});
const GAMES = [ALICE_GAME, BOB_GAME];

// ── gamesOverviewLoader tests ─────────────────────────────────────────────────
describe("gamesOverviewLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appQueryClient.clear();
  });

  it("should fill the games overview query with limit=9 and offset=0 by default", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: GAMES, total: 2 });

    await gamesOverviewLoader(makeLoaderArgs(new Request("http://localhost/games")));

    expect(getGamesOverviewMock).toHaveBeenCalledWith(9, 0, expect.any(AbortSignal));
    expect(
      appQueryClient.getQueryData(statsQueries.games({ limit: 9, offset: 0 }).queryKey),
    ).toEqual({ items: GAMES, total: 2 });
  });

  it("should read offset from URL search params", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [], total: 0 });

    await gamesOverviewLoader(makeLoaderArgs(new Request("http://localhost/games?offset=18")));

    expect(getGamesOverviewMock).toHaveBeenCalledWith(9, 18, expect.any(AbortSignal));
  });

  it.each(["abc", "-9", "1.5"])(
    "should read the first page for the invalid offset %s",
    async (offset) => {
      getGamesOverviewMock.mockResolvedValue({ items: [], total: 0 });

      await gamesOverviewLoader(
        makeLoaderArgs(new Request(`http://localhost/games?offset=${offset}`)),
      );

      expect(getGamesOverviewMock).toHaveBeenCalledWith(9, 0, expect.any(AbortSignal));
    },
  );

  it("should not throw and should log when the API rejects", async () => {
    const failure = new Error("Network error");
    getGamesOverviewMock.mockRejectedValue(failure);

    await expect(
      gamesOverviewLoader(makeLoaderArgs(new Request("http://localhost/games"))),
    ).resolves.toBeNull();

    expect(clientLogger.error).toHaveBeenCalledWith("statistics.games-overview.fetch.failed", {
      context: { limit: 9, offset: 0 },
      error: failure,
    });
  });
});
