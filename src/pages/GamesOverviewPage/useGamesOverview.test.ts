// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFinishedGame } from "@/shared/types/game.test-support";
import { gamesOverviewLoader, useGamesOverview } from "./useGamesOverview";

// ── API mock ─────────────────────────────────────────────────────────────────
const getGamesOverviewMock = vi.fn();

vi.mock("@/shared/api/statistics", () => ({
  getGamesOverview: (...args: unknown[]) => getGamesOverviewMock(...args),
}));

// ── React Router hooks mock ───────────────────────────────────────────────────
const navigateMock = vi.fn();
let loaderDataMock: unknown = { games: [], total: 0, error: null };
let navigationStateMock: "idle" | "loading" | "submitting" = "idle";

vi.mock("react-router-dom", () => ({
  useLoaderData: () => loaderDataMock,
  useNavigation: () => ({ state: navigationStateMock }),
  useNavigate: () => navigateMock,
}));

const GAMES = [
  buildFinishedGame({
    id: 1,
    winnerRounds: 12,
    winnerName: "Alice",
    playersCount: 4,
    date: "2024-01-15T00:00:00Z",
  }),
  buildFinishedGame({
    id: 2,
    winnerRounds: 8,
    winnerName: "Bob",
    playersCount: 3,
    date: "2024-01-10T00:00:00Z",
  }),
];

// ── gamesOverviewLoader tests ─────────────────────────────────────────────────
describe("gamesOverviewLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return games and total when API succeeds", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: GAMES, total: 2 });

    const result = await gamesOverviewLoader({
      request: new Request("http://localhost/games"),
      params: {},
    });

    expect(result.games).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.error).toBeNull();
  });

  it("should pass limit=9 and offset=0 by default", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [], total: 0 });

    await gamesOverviewLoader({
      request: new Request("http://localhost/games"),
      params: {},
    });

    expect(getGamesOverviewMock).toHaveBeenCalledWith(9, 0, expect.any(AbortSignal));
  });

  it("should read offset from URL search params", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [], total: 0 });

    await gamesOverviewLoader({
      request: new Request("http://localhost/games?offset=18"),
      params: {},
    });

    expect(getGamesOverviewMock).toHaveBeenCalledWith(9, 18, expect.any(AbortSignal));
  });

  it("should return error sentinel when API rejects", async () => {
    getGamesOverviewMock.mockRejectedValue(new Error("Network error"));

    const result = await gamesOverviewLoader({
      request: new Request("http://localhost/games"),
      params: {},
    });

    expect(result.error).toBe("Could not load games overview");
    expect(result.games).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("should return error sentinel when API returns incomplete game data", async () => {
    getGamesOverviewMock.mockResolvedValue({
      items: [{ id: 1, winnerRounds: 12, winnerName: null, playersCount: 4, date: null }],
      total: 1,
    });

    const result = await gamesOverviewLoader({
      request: new Request("http://localhost/games"),
      params: {},
    });

    expect(result.error).toBe("Could not load games overview");
    expect(result.games).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("should return empty games list with no error when API returns empty items", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [], total: 0 });

    const result = await gamesOverviewLoader({
      request: new Request("http://localhost/games"),
      params: {},
    });

    expect(result.error).toBeNull();
    expect(result.games).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ── useGamesOverview hook tests ───────────────────────────────────────────────
describe("useGamesOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationStateMock = "idle";
    loaderDataMock = { games: [], total: 0, error: null };
  });

  it("should return games and total when loader data contains games", () => {
    loaderDataMock = { games: GAMES, total: 2, error: null };

    const { result } = renderHook(() => useGamesOverview());

    expect(result.current.games).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it("should return loading=false when navigation state is idle", () => {
    navigationStateMock = "idle";

    const { result } = renderHook(() => useGamesOverview());

    expect(result.current.loading).toBe(false);
  });

  it("should return loading=true when navigation state is loading", () => {
    navigationStateMock = "loading";

    const { result } = renderHook(() => useGamesOverview());

    expect(result.current.loading).toBe(true);
  });

  it("should return error when loader data contains an error", () => {
    loaderDataMock = { games: [], total: 0, error: "Could not load games overview" };

    const { result } = renderHook(() => useGamesOverview());

    expect(result.current.error).toBe("Could not load games overview");
    expect(result.current.games).toEqual([]);
  });

  it("should call navigate(0) when retry is invoked", () => {
    const { result } = renderHook(() => useGamesOverview());

    result.current.retry();

    expect(navigateMock).toHaveBeenCalledWith(0);
  });

  it("should throw when loader data has unexpected shape", () => {
    loaderDataMock = null;

    expect(() => renderHook(() => useGamesOverview())).toThrow(
      "Unexpected loader data format for GamesOverviewPage",
    );
  });
});
