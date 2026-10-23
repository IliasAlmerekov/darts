// @vitest-environment jsdom

// Regression tests for the throw sync rules in ADR 0003. Tests marked `it.fails` describe
// behaviour the page does not have yet; #123 turns them green one by one.

vi.mock("@/shared/api/game", () => ({
  abortGame: vi.fn(),
  finishGame: vi.fn(),
  getGameThrows: vi.fn(),
  getGameThrowsIfChanged: vi.fn(),
  recordThrow: vi.fn(),
  resetGameStateVersion: vi.fn(),
  setGameStateVersion: vi.fn(),
  undoLastThrow: vi.fn(),
  updateGameSettings: vi.fn(),
}));

vi.mock("@/shared/services/browser/soundPlayer", () => ({
  playSound: vi.fn(),
  unlockSounds: vi.fn(),
}));

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, RouterProvider, Routes, createMemoryRouter } from "react-router-dom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api";
import {
  finishGame,
  getGameThrows,
  getGameThrowsIfChanged,
  recordThrow,
  undoLastThrow,
  type ThrowAckResponse,
} from "@/shared/api/game";
import { playSound } from "@/shared/services/browser/soundPlayer";
import { setGameData } from "@/shared/store";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import type { GameThrowsResponse } from "@/types";
import * as gameStore from "@/shared/store/game-state";
import GamePage from ".";

const getGameThrowsIfChangedMock = vi.mocked(getGameThrowsIfChanged);
const getGameThrowsMock = vi.mocked(getGameThrows);
const recordThrowMock = vi.mocked(recordThrow);
const undoLastThrowMock = vi.mocked(undoLastThrow);
const finishGameMock = vi.mocked(finishGame);
const playSoundMock = vi.mocked(playSound);

const GAME_ID = 4;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function buildGame(scores: { alice: number; bob: number }): GameThrowsResponse {
  return buildGameThrowsResponse({
    id: GAME_ID,
    settings: { startScore: 301, doubleOut: false, tripleOut: false },
    players: [
      buildBackendPlayer({
        id: 1,
        name: "Alice",
        score: scores.alice,
        isActive: true,
        position: null,
      }),
      buildBackendPlayer({
        id: 2,
        name: "Bob",
        score: scores.bob,
        position: scores.bob === 0 ? 1 : null,
      }),
    ],
  });
}

function buildThrowAck(scores: { alice: number; bob: number }): ThrowAckResponse {
  return {
    type: "ack",
    success: true,
    gameId: GAME_ID,
    stateVersion: "v2",
    throw: null,
    scoreboardDelta: {
      changedPlayers: [
        { playerId: 1, name: "Alice", score: scores.alice, isActive: true, isGuest: false },
        { playerId: 2, name: "Bob", score: scores.bob, isActive: false, isGuest: false },
      ],
      winnerId: null,
      status: "started",
      currentRound: 1,
    },
    serverTs: "2026-10-23T10:00:00Z",
  };
}

/** The ack for Alice's checkout from 19: Bob is the one active player left. */
function buildWinningAck(): ThrowAckResponse {
  const ack = buildThrowAck({ alice: 0, bob: 301 });
  ack.scoreboardDelta.changedPlayers = [
    { playerId: 1, name: "Alice", score: 0, isActive: false, isGuest: false, position: 1 },
    { playerId: 2, name: "Bob", score: 301, isActive: true, isGuest: false },
  ];
  return ack;
}

function stateVersionConflict(): ApiError {
  return new ApiError("Conflict", { status: 409, data: { error: "GAME_STATE_VERSION_MISMATCH" } });
}

function renderGamePage(): void {
  render(
    <MemoryRouter initialEntries={[`/game/${GAME_ID}`]}>
      <Routes>
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="/summary/:id" element={<p>Summary page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function tap(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

function playerCard(name: string): HTMLElement {
  return screen.getByRole("group", { name });
}

async function openGame(game: GameThrowsResponse): Promise<void> {
  getGameThrowsIfChangedMock.mockResolvedValue(game);
  renderGamePage();
  await screen.findByRole("group", { name: "Alice" });
}

let originalScrollIntoView: typeof HTMLElement.prototype.scrollIntoView | undefined;

beforeAll(() => {
  originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterAll(() => {
  if (originalScrollIntoView !== undefined) {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    return;
  }

  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

describe("GamePage throw sync", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.sessionStorage.clear();
    gameStore.resetGameStore();
    finishGameMock.mockResolvedValue([]);
  });

  // #96
  it("finishes the game only after the server acknowledges the winning throw", async () => {
    const winningThrow = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(winningThrow.promise);
    getGameThrowsMock.mockResolvedValue(buildGame({ alice: 19, bob: 301 }));
    getGameThrowsIfChangedMock.mockResolvedValue(buildGame({ alice: 19, bob: 301 }));
    await openGame(buildGame({ alice: 19, bob: 301 }));

    tap("19");
    await waitFor(() => {
      expect(recordThrowMock).toHaveBeenCalledTimes(1);
    });
    expect(finishGameMock).not.toHaveBeenCalled();

    winningThrow.reject(stateVersionConflict());

    await waitFor(() => {
      expect(within(playerCard("Alice")).getByText("19")).toBeTruthy();
    });
    expect(finishGameMock).not.toHaveBeenCalled();
  });

  // ADR 0003: the overlay shows at once and closes again when the server rejects the checkout.
  it("closes the finish overlay and rolls back when a checkout with 3 players is rejected", async () => {
    const checkout = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(checkout.promise);
    const twoPlayerGame = buildGame({ alice: 19, bob: 301 });
    const game: GameThrowsResponse = {
      ...twoPlayerGame,
      players: [
        ...twoPlayerGame.players,
        buildBackendPlayer({ id: 3, name: "Carol", score: 301, position: null }),
      ],
    };
    getGameThrowsMock.mockResolvedValue(game);
    await openGame(game);

    tap("19");
    expect(screen.getByText("Player Finished! Continue Game?")).toBeTruthy();

    checkout.reject(stateVersionConflict());

    await waitFor(() => {
      expect(screen.queryByText("Player Finished! Continue Game?")).toBeNull();
    });
    expect(within(playerCard("Alice")).getByText("19")).toBeTruthy();
    expect(finishGameMock).not.toHaveBeenCalled();
  });

  // #96
  it("finishes the game once and opens the summary after the winning throw ack", async () => {
    const winningThrow = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(winningThrow.promise);
    await openGame(buildGame({ alice: 19, bob: 301 }));

    tap("19");
    await waitFor(() => {
      expect(recordThrowMock).toHaveBeenCalledTimes(1);
    });
    expect(finishGameMock).not.toHaveBeenCalled();

    const ack = buildThrowAck({ alice: 0, bob: 301 });
    ack.scoreboardDelta.changedPlayers = [
      { playerId: 1, name: "Alice", score: 0, isActive: false, isGuest: false, position: 1 },
      { playerId: 2, name: "Bob", score: 301, isActive: true, isGuest: false },
    ];
    winningThrow.resolve(ack);

    expect(await screen.findByText("Summary page")).toBeTruthy();
    expect(finishGameMock).toHaveBeenCalledTimes(1);
  });

  it("rolls back the next player's throws when a throw of the previous player is rejected", async () => {
    const firstThrow = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(firstThrow.promise);
    getGameThrowsMock.mockResolvedValue(buildGame({ alice: 301, bob: 301 }));
    await openGame(buildGame({ alice: 301, bob: 301 }));

    tap("20");
    tap("20");
    tap("20");
    tap("5");
    expect(within(playerCard("Alice")).getByText("241")).toBeTruthy();
    expect(within(playerCard("Bob")).getByText("296")).toBeTruthy();

    firstThrow.reject(stateVersionConflict());

    expect(await screen.findByText(/not saved/i)).toBeTruthy();
    expect(within(playerCard("Alice")).getByText("301")).toBeTruthy();
    expect(within(playerCard("Bob")).getByText("301")).toBeTruthy();
    expect(recordThrowMock).toHaveBeenCalledTimes(1);
  });

  // #123
  it("removes a throw that has not been sent yet on undo, without a request", async () => {
    const firstThrow = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(firstThrow.promise);
    await openGame(buildGame({ alice: 301, bob: 301 }));

    tap("20");
    tap("5");
    expect(within(playerCard("Alice")).getByText("276")).toBeTruthy();

    tap("Undo");
    await waitFor(() => {
      expect(within(playerCard("Alice")).getByText("281")).toBeTruthy();
    });

    // Let the queue handle the ack and send whatever it still holds before asserting.
    await act(async () => {
      firstThrow.resolve(buildThrowAck({ alice: 281, bob: 301 }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(within(playerCard("Alice")).getByText("281")).toBeTruthy();
    expect(recordThrowMock).toHaveBeenCalledTimes(1);
    expect(undoLastThrowMock).not.toHaveBeenCalled();
  });

  // #105
  it("accepts six unconfirmed throws, then disables throw input while syncing", async () => {
    recordThrowMock.mockReturnValue(new Promise<ThrowAckResponse>(() => {}));
    await openGame(buildGame({ alice: 301, bob: 301 }));

    for (let throwCount = 0; throwCount < 6; throwCount += 1) {
      tap("20");
    }

    expect(within(playerCard("Alice")).getByText("241")).toBeTruthy();
    expect(within(playerCard("Bob")).getByText("241")).toBeTruthy();
    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/syncing/i)).toBeTruthy();
  });

  // #98
  it("keeps input disabled after a failed sync until Retry reloads the game", async () => {
    recordThrowMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await openGame(buildGame({ alice: 301, bob: 301 }));
    getGameThrowsMock.mockRejectedValue(new TypeError("Failed to fetch"));
    getGameThrowsIfChangedMock.mockRejectedValue(new TypeError("Failed to fetch"));

    tap("20");

    const retryButton = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getByText(/not saved/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(true);

    getGameThrowsMock.mockResolvedValue(buildGame({ alice: 301, bob: 301 }));
    getGameThrowsIfChangedMock.mockResolvedValue(buildGame({ alice: 301, bob: 301 }));
    fireEvent.click(retryButton);

    // Input can come back before the reload answers, so wait for the reloaded score too.
    await waitFor(() => {
      expect(within(playerCard("Alice")).getByText("301")).toBeTruthy();
      expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(false);
    });
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("shows the server's game after it refuses a throw", async () => {
    recordThrowMock.mockRejectedValueOnce(
      new ApiError("Request failed", { status: 409, data: { error: "GAME_THROW_NOT_ALLOWED" } }),
    );
    getGameThrowsMock.mockResolvedValue(buildGame({ alice: 250, bob: 301 }));
    await openGame(buildGame({ alice: 301, bob: 301 }));

    tap("20");

    expect(await screen.findByText(/not saved/i)).toBeTruthy();
    expect(within(playerCard("Alice")).getByText("250")).toBeTruthy();
    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(false);
  });

  it("keeps throw and undo input disabled until the first load answers, also with a cached game", async () => {
    const firstLoad = createDeferred<GameThrowsResponse | null>();
    getGameThrowsIfChangedMock.mockReturnValueOnce(firstLoad.promise);
    // A score below the start score, so Undo is enabled once the load answers.
    setGameData(buildGame({ alice: 281, bob: 301 }));
    renderGamePage();

    expect(within(playerCard("Alice")).getByText("281")).toBeTruthy();
    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(true);

    await act(async () => {
      firstLoad.resolve(buildGame({ alice: 281, bob: 301 }));
      await firstLoad.promise;
    });

    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(false);
  });

  // The summary's Undo reopens the game on the server and leaves the finished copy in the store.
  it("loads a game the summary reopened instead of returning to the summary", async () => {
    setGameData({ ...buildGame({ alice: 0, bob: 40 }), status: "finished", winnerId: 1 });
    getGameThrowsIfChangedMock.mockResolvedValue(buildGame({ alice: 20, bob: 40 }));
    renderGamePage();

    await waitFor(() => {
      expect(within(playerCard("Alice")).getByText("20")).toBeTruthy();
    });
    expect(screen.queryByText("Summary page")).toBeNull();
    expect(finishGameMock).not.toHaveBeenCalled();
  });

  it("keeps the sync status region on the page while idle and puts the failure in it", async () => {
    recordThrowMock.mockRejectedValueOnce(stateVersionConflict());
    getGameThrowsMock.mockResolvedValue(buildGame({ alice: 301, bob: 301 }));
    await openGame(buildGame({ alice: 301, bob: 301 }));

    expect(screen.getByRole("status").textContent).toBe("");

    tap("20");

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/not saved/i);
    });
  });

  it("plays the undo sound on the tap, before the server answers", async () => {
    recordThrowMock.mockReturnValue(new Promise<ThrowAckResponse>(() => {}));
    await openGame(buildGame({ alice: 301, bob: 301 }));

    tap("20");
    tap("Undo");

    expect(playSoundMock).toHaveBeenCalledWith("undo");
  });

  // #123
  it("keeps throw and undo input disabled while /finish runs", async () => {
    finishGameMock.mockReturnValue(new Promise(() => {}));
    recordThrowMock.mockResolvedValueOnce(buildWinningAck());
    await openGame(buildGame({ alice: 19, bob: 301 }));

    tap("19");

    await waitFor(() => {
      expect(finishGameMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(true);
  });

  // #123
  it("offers Retry after /finish fails and opens the summary once it works", async () => {
    finishGameMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    recordThrowMock.mockResolvedValueOnce(buildWinningAck());
    await openGame(buildGame({ alice: 19, bob: 301 }));

    tap("19");

    const retryButton = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getByRole("status").textContent).toMatch(/could not finish/i);
    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("Summary page")).toBeNull();

    fireEvent.click(retryButton);

    expect(await screen.findByText("Summary page")).toBeTruthy();
    expect(finishGameMock).toHaveBeenCalledTimes(2);
  });

  // #95, #123
  it("ignores a /finish answer that arrives after the page moved to another game", async () => {
    const finish = createDeferred<Awaited<ReturnType<typeof finishGame>>>();
    finishGameMock.mockReturnValueOnce(finish.promise);
    recordThrowMock.mockResolvedValueOnce(buildWinningAck());
    getGameThrowsIfChangedMock.mockImplementation((id) =>
      Promise.resolve({ ...buildGame({ alice: 19, bob: 301 }), id }),
    );
    const router = createMemoryRouter(
      [
        { path: "/game/:id", element: <GamePage /> },
        { path: "/summary/:id", element: <p>Summary page</p> },
      ],
      { initialEntries: [`/game/${GAME_ID}`] },
    );
    render(<RouterProvider router={router} />);
    await screen.findByRole("group", { name: "Alice" });

    tap("19");
    await waitFor(() => {
      expect(finishGameMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await router.navigate("/game/5");
    });
    await screen.findByRole("group", { name: "Alice" });

    await act(async () => {
      finish.resolve([]);
      await finish.promise;
    });

    expect(router.state.location.pathname).toBe("/game/5");
    expect(screen.queryByText("Summary page")).toBeNull();
    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(false);
  });

  // #123: the server acknowledged the winning throw, but the page left before /finish.
  it("finishes a loaded game that has one active player left, once", async () => {
    const finish = createDeferred<Awaited<ReturnType<typeof finishGame>>>();
    finishGameMock.mockReturnValueOnce(finish.promise);
    getGameThrowsIfChangedMock.mockResolvedValue(buildGame({ alice: 0, bob: 301 }));
    renderGamePage();

    await waitFor(() => {
      expect(finishGameMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(true);

    await act(async () => {
      finish.resolve([]);
      await finish.promise;
    });

    expect(await screen.findByText("Summary page")).toBeTruthy();
    expect(finishGameMock).toHaveBeenCalledTimes(1);
    expect(finishGameMock).toHaveBeenCalledWith(GAME_ID, expect.any(AbortSignal));
  });
});
