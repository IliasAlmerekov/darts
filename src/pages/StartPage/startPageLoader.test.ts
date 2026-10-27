// @vitest-environment jsdom
import type { LoaderFunctionArgs } from "react-router-dom";
import { QueryObserver } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeLoaderArgs } from "@/test/loaderArgs";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { startPageLoader } from "./startPageLoader";

// ── store mocks ───────────────────────────────────────────────────────────────

const setGameDataMock = vi.fn();
const setInvitationMock = vi.fn();

const $invitationGet = vi.fn(() => null as { gameId: number; invitationLink: string } | null);

vi.mock("@/shared/store", () => ({
  $gameData: { get: () => null },
  $invitation: { get: () => $invitationGet() },
  getCachedGameSettings: () => null,
  setGameData: (...args: unknown[]) => setGameDataMock(...args),
  setInvitation: (...args: unknown[]) => setInvitationMock(...args),
  setServerCurrentGameId: vi.fn(),
}));

// ── API mocks ─────────────────────────────────────────────────────────────────

const getGameThrowsMock = vi.fn();
const getInvitationMock = vi.fn();
const getTabletGameMock = vi.fn();

vi.mock("@/shared/api/game", () => ({
  getGameThrows: (...args: unknown[]) => getGameThrowsMock(...args),
  getTabletGame: (...args: unknown[]) => getTabletGameMock(...args),
}));

vi.mock("@/shared/api/room", () => ({
  getInvitation: (...args: unknown[]) => getInvitationMock(...args),
}));

// ── logger mock ───────────────────────────────────────────────────────────────

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { warn: vi.fn(), error: vi.fn() },
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function makeArgs(id?: string): LoaderFunctionArgs {
  return makeLoaderArgs(new Request(`http://localhost/start${id ? `/${id}` : ""}`), { id });
}

function lobbyGame(gameId: number) {
  return { status: "lobby" as const, id: gameId, players: [], settings: null };
}

function tabletGame(game: { id: number; status: "lobby" | "started" } | null) {
  return { game, lastFinishedGameId: null };
}

function redirectLocation(result: unknown): string | null {
  if (!(result instanceof Response)) return null;
  return result.headers.get("Location");
}

// ── global reset — runs before every test ────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  queryClient.clear();
  $invitationGet.mockReturnValue(null);
  getTabletGameMock.mockResolvedValue(tabletGame({ id: 42, status: "lobby" }));
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("startPageLoader — follows the tablet game", () => {
  it("returns null without fetching when there is no id and no tablet game", async () => {
    getTabletGameMock.mockResolvedValue(tabletGame(null));

    const result = await startPageLoader(makeArgs());

    expect(result).toBeNull();
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });

  it("redirects a URL without id to the lobby of the tablet game", async () => {
    const result = await startPageLoader(makeArgs());

    expect(redirectLocation(result)).toBe("/start/42");
  });

  it("redirects a foreign id to the lobby of the tablet game", async () => {
    const result = await startPageLoader(makeArgs("77"));

    expect(redirectLocation(result)).toBe("/start/42");
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });

  it.each(["abc", "0", "-5", "1e3"])(
    "throws a 404 response and sends no request for the invalid id %s",
    async (id) => {
      await expect(startPageLoader(makeArgs(id))).rejects.toMatchObject({ status: 404 });

      expect(getTabletGameMock).not.toHaveBeenCalled();
      expect(getGameThrowsMock).not.toHaveBeenCalled();
      expect(getInvitationMock).not.toHaveBeenCalled();
    },
  );

  it("redirects to the game page when the tablet game has started", async () => {
    getTabletGameMock.mockResolvedValue(tabletGame({ id: 42, status: "started" }));

    const result = await startPageLoader(makeArgs("42"));

    expect(redirectLocation(result)).toBe("/game/42");
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });

  it("returns null without fetching when the tablet game read fails", async () => {
    getTabletGameMock.mockRejectedValue(new Error("Network error"));

    const result = await startPageLoader(makeArgs("42"));

    expect(result).toBeNull();
    expect(getGameThrowsMock).not.toHaveBeenCalled();
    expect(setGameDataMock).not.toHaveBeenCalled();
  });
});

describe("startPageLoader — invitation already loaded", () => {
  it("returns null without fetching when invitation.gameId matches URL gameId", async () => {
    $invitationGet.mockReturnValue({ gameId: 42, invitationLink: "/invite/42" });

    const result = await startPageLoader(makeArgs("42"));

    expect(result).toBeNull();
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });

  it("redirects to the game page when the tablet game has started, though the invitation holds the same game", async () => {
    $invitationGet.mockReturnValue({ gameId: 42, invitationLink: "/invite/42" });
    getTabletGameMock.mockResolvedValue(tabletGame({ id: 42, status: "started" }));

    const result = await startPageLoader(makeArgs("42"));

    expect(redirectLocation(result)).toBe("/game/42");
  });

  it("drops lobby players cached on an earlier visit, so the page reads them again", async () => {
    $invitationGet.mockReturnValue({ gameId: 42, invitationLink: "/invite/42" });
    queryClient.setQueryData(gameQueries.lobbyPlayers(42).queryKey, [
      { id: 1, name: "Alice", position: 0 },
    ]);

    await startPageLoader(makeArgs("42"));

    expect(queryClient.getQueryData(gameQueries.lobbyPlayers(42).queryKey)).toBeUndefined();
  });

  it("keeps the lobby players while a page observes them", async () => {
    $invitationGet.mockReturnValue({ gameId: 42, invitationLink: "/invite/42" });
    const { queryKey } = gameQueries.lobbyPlayers(42);
    const players = [{ id: 1, name: "Alice", position: 0 }];
    queryClient.setQueryData(queryKey, players);
    const observer = new QueryObserver(queryClient, {
      queryKey,
      queryFn: () => Promise.resolve(players),
      staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => {});

    await startPageLoader(makeArgs("42"));

    expect(queryClient.getQueryData(queryKey)).toEqual(players);
    unsubscribe();
  });
});

describe("startPageLoader — fetch and store update", () => {
  beforeEach(() => {
    getGameThrowsMock.mockResolvedValue(lobbyGame(42));
    getInvitationMock.mockResolvedValue({ gameId: 42, invitationLink: "/invite/42" });
  });

  it("calls getGameThrows with gameId and an AbortSignal", async () => {
    await startPageLoader(makeArgs("42"));

    expect(getGameThrowsMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
  });

  it("passes the same AbortSignal to both getGameThrows and getInvitation", async () => {
    await startPageLoader(makeArgs("42"));

    const throwsSignal = getGameThrowsMock.mock.calls[0]?.[1] as AbortSignal | undefined;
    const invitationSignal = getInvitationMock.mock.calls[0]?.[1] as AbortSignal | undefined;

    expect(throwsSignal).toBeInstanceOf(AbortSignal);
    expect(invitationSignal).toBe(throwsSignal);
  });

  it("calls setGameData with fetched game data", async () => {
    await startPageLoader(makeArgs("42"));

    expect(setGameDataMock).toHaveBeenCalledWith(lobbyGame(42));
  });

  it("calls setInvitation after successful fetch", async () => {
    await startPageLoader(makeArgs("42"));

    expect(setInvitationMock).toHaveBeenCalledWith({ gameId: 42, invitationLink: "/invite/42" });
  });

  it("writes the fetched players into the lobby players query in position order", async () => {
    getGameThrowsMock.mockResolvedValue({
      ...lobbyGame(42),
      players: [
        { id: 2, name: "Bob", position: 1 },
        { id: 1, name: "Alice", position: 0 },
      ],
    });

    await startPageLoader(makeArgs("42"));

    expect(queryClient.getQueryData(gameQueries.lobbyPlayers(42).queryKey)).toEqual([
      { id: 1, name: "Alice", position: 0 },
      { id: 2, name: "Bob", position: 1 },
    ]);
  });

  it("returns null on full success", async () => {
    const result = await startPageLoader(makeArgs("42"));
    expect(result).toBeNull();
  });
});

describe("startPageLoader — game left the lobby between the reads", () => {
  it("redirects to the game page without storing the game when it has started", async () => {
    getGameThrowsMock.mockResolvedValue({ status: "started", id: 42, players: [], settings: null });

    const result = await startPageLoader(makeArgs("42"));

    expect(redirectLocation(result)).toBe("/game/42");
    expect(setGameDataMock).not.toHaveBeenCalled();
  });

  it("returns null without storing the game when it has finished", async () => {
    getGameThrowsMock.mockResolvedValue({
      status: "finished",
      id: 42,
      players: [],
      settings: null,
    });

    const result = await startPageLoader(makeArgs("42"));

    expect(result).toBeNull();
    expect(setGameDataMock).not.toHaveBeenCalled();
  });
});

describe("startPageLoader — getGameThrows error handling", () => {
  it("returns null without storing the game on network error", async () => {
    getGameThrowsMock.mockRejectedValue(new Error("Network error"));

    const result = await startPageLoader(makeArgs("42"));

    expect(result).toBeNull();
    expect(setGameDataMock).not.toHaveBeenCalled();
  });

  it("re-throws AbortError so React Router can handle navigation cancellation", async () => {
    // The navigation is cancelled after the tablet game read, while this request runs.
    const controller = new AbortController();
    controller.abort();
    getGameThrowsMock.mockRejectedValue(controller.signal.reason as unknown);

    await expect(startPageLoader(makeArgs("42"))).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});

describe("startPageLoader — getInvitation error handling", () => {
  beforeEach(() => {
    getGameThrowsMock.mockResolvedValue(lobbyGame(42));
  });

  it("keeps the game data and stores no invitation when getInvitation fails", async () => {
    getInvitationMock.mockRejectedValue(new Error("Network error"));

    const result = await startPageLoader(makeArgs("42"));

    expect(result).toBeNull();
    expect(setGameDataMock).toHaveBeenCalled();
    expect(setInvitationMock).not.toHaveBeenCalled();
  });

  it("re-throws AbortError from getInvitation", async () => {
    // The navigation is cancelled after the tablet game read, while this request runs.
    const controller = new AbortController();
    controller.abort();
    getInvitationMock.mockRejectedValue(controller.signal.reason as unknown);

    await expect(startPageLoader(makeArgs("42"))).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
