// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeLoaderArgs } from "@/test/loaderArgs";
import { buildFinishedGame } from "@/shared/types/game.test-support";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { createQueryClient, queryClient as appQueryClient } from "@/shared/query/queryClient";
import { statsQueries } from "@/shared/query/statistics.queries";
import type { FinishedGameProps } from "@/types";
import { gamesOverviewLoader, useGamesOverview } from "./useGamesOverview";

// ── API mock ─────────────────────────────────────────────────────────────────
const getGamesOverviewMock = vi.fn();

vi.mock("@/shared/api/statistics", () => ({
  getGamesOverview: (...args: unknown[]) => getGamesOverviewMock(...args),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ── React Router hooks mock ───────────────────────────────────────────────────
let searchParamsMock = new URLSearchParams();
let navigationStateMock: "idle" | "loading" | "submitting" = "idle";

vi.mock("react-router-dom", () => ({
  useNavigation: () => ({ state: navigationStateMock }),
  useSearchParams: () => [searchParamsMock, vi.fn()],
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

const INCOMPLETE_GAME = { id: 3, winnerRounds: 12, winnerName: null, playersCount: 4, date: null };

let testQueryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return createElement(QueryClientProvider, { client: testQueryClient }, children);
}

function renderOverviewHook() {
  return renderHook(() => useGamesOverview(), { wrapper });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

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

// ── useGamesOverview hook tests ───────────────────────────────────────────────
describe("useGamesOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationStateMock = "idle";
    searchParamsMock = new URLSearchParams();
    testQueryClient = createQueryClient();
  });

  it("should return the games the loader cached without a second request", () => {
    testQueryClient.setQueryData(statsQueries.games({ limit: 9, offset: 0 }).queryKey, {
      items: GAMES,
      total: 2,
    });

    const { result } = renderOverviewHook();

    expect(result.current.games).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBeNull();
    expect(getGamesOverviewMock).not.toHaveBeenCalled();
  });

  it("should return loading=true when navigation state is loading", () => {
    navigationStateMock = "loading";
    testQueryClient.setQueryData(statsQueries.games({ limit: 9, offset: 0 }).queryKey, {
      items: GAMES,
      total: 2,
    });

    const { result } = renderOverviewHook();

    expect(result.current.loading).toBe(true);
  });

  it("should show the games overview error message when the read fails", async () => {
    getGamesOverviewMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderOverviewHook();

    await waitFor(() => {
      expect(result.current.error).toBe("Could not load games overview");
    });
    expect(result.current.games).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it("should put the query in an error state and log when a row is incomplete", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [ALICE_GAME, INCOMPLETE_GAME], total: 2 });

    const { result } = renderOverviewHook();

    await waitFor(() => {
      expect(result.current.error).toBe("Could not load games overview");
    });
    expect(result.current.games).toEqual([]);
    expect(
      testQueryClient.getQueryState(statsQueries.games({ limit: 9, offset: 0 }).queryKey)?.status,
    ).toBe("error");
    expect(clientLogger.error).toHaveBeenCalledWith("statistics.games-overview.invalid-data", {
      context: { limit: 9, offset: 0, invalidGameIds: [3] },
    });
    expect(clientLogger.error).not.toHaveBeenCalledWith(
      "statistics.games-overview.fetch.failed",
      expect.anything(),
    );
  });

  it("should refetch the query on retry and show the new games", async () => {
    getGamesOverviewMock.mockRejectedValueOnce(new Error("Network error"));
    const { result } = renderOverviewHook();
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    getGamesOverviewMock.mockResolvedValueOnce({ items: GAMES, total: 2 });
    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.games).toHaveLength(2);
    });
    expect(result.current.error).toBeNull();
    expect(getGamesOverviewMock).toHaveBeenCalledTimes(2);
  });

  it("should show offset B's games when offset A's response arrives after B's", async () => {
    const pageA = deferred<{ items: FinishedGameProps[]; total: number }>();
    const pageB = deferred<{ items: FinishedGameProps[]; total: number }>();
    getGamesOverviewMock.mockImplementation((_limit: number, offset: number) =>
      offset === 0 ? pageA.promise : pageB.promise,
    );
    const { result, rerender } = renderOverviewHook();

    searchParamsMock = new URLSearchParams("offset=9");
    rerender();
    await act(async () => {
      pageB.resolve({ items: [BOB_GAME], total: 11 });
      await pageB.promise;
    });
    await act(async () => {
      pageA.resolve({ items: [ALICE_GAME], total: 11 });
      await pageA.promise;
    });

    await waitFor(() => {
      expect(result.current.games.map((game) => game.winnerName)).toEqual(["Bob"]);
    });
  });
});
