// @vitest-environment jsdom

// Regression tests for the throw sync rules in ADR 0003.

vi.mock("@/shared/api/game", () => ({
  abortGame: vi.fn(),
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
import {
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
  createMemoryRouter,
  useLocation,
} from "react-router-dom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api";
import {
  getGameThrows,
  getGameThrowsIfChanged,
  recordThrow,
  undoLastThrow,
  updateGameSettings,
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
const updateGameSettingsMock = vi.mocked(updateGameSettings);
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

function buildGameWithAliceThrow(): GameThrowsResponse {
  const game = buildGame({ alice: 281, bob: 301 });

  return {
    ...game,
    players: game.players.map((player) =>
      player.id === 1
        ? {
            ...player,
            throwsInCurrentRound: 1,
            currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
          }
        : player,
    ),
  };
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

/**
 * The ack for Alice's checkout from 19, as the backend sends it: the throw leaves one active
 * player, so the server finishes the game in the same request and normalizes the positions.
 */
function buildWinningAck(): ThrowAckResponse {
  const ack = buildThrowAck({ alice: 0, bob: 301 });
  ack.scoreboardDelta = {
    changedPlayers: [
      { playerId: 1, name: "Alice", score: 0, isActive: false, isGuest: false, position: 1 },
      { playerId: 2, name: "Bob", score: 301, isActive: true, isGuest: false, position: 2 },
    ],
    winnerId: 1,
    status: "finished",
    currentRound: 1,
  };
  return ack;
}

/** Shows the game id the game page passed to the summary in the location state. */
function SummaryProbe(): React.JSX.Element {
  const state: unknown = useLocation().state;
  const finishedGameId =
    typeof state === "object" && state !== null && "finishedGameId" in state
      ? String(state.finishedGameId)
      : "none";
  return <p>Summary page for game {finishedGameId}</p>;
}

function stateVersionConflict(): ApiError {
  return new ApiError("Conflict", { status: 409, data: { error: "GAME_STATE_VERSION_MISMATCH" } });
}

function renderGamePage(): void {
  render(
    <MemoryRouter initialEntries={[`/game/${GAME_ID}`]}>
      <Routes>
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="/summary/:id" element={<SummaryProbe />} />
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
  });

  // #96
  it("rolls back a rejected winning throw and opens no summary", async () => {
    const winningThrow = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(winningThrow.promise);
    getGameThrowsMock.mockResolvedValue(buildGame({ alice: 19, bob: 301 }));
    await openGame(buildGame({ alice: 19, bob: 301 }));

    tap("19");
    await waitFor(() => {
      expect(recordThrowMock).toHaveBeenCalledTimes(1);
    });

    winningThrow.reject(stateVersionConflict());

    await waitFor(() => {
      expect(within(playerCard("Alice")).getByText("19")).toBeTruthy();
    });
    expect(screen.queryByText(/Summary page/)).toBeNull();
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
    expect(screen.queryByText(/Summary page/)).toBeNull();
  });

  // #96: the server finishes the game with the winning throw, so its ack is the signal.
  it("opens the summary once the winning throw ack says the game is finished", async () => {
    const winningThrow = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(winningThrow.promise);
    await openGame(buildGame({ alice: 19, bob: 301 }));

    tap("19");
    await waitFor(() => {
      expect(recordThrowMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(/Summary page/)).toBeNull();

    winningThrow.resolve(buildWinningAck());

    expect(await screen.findByText(`Summary page for game ${GAME_ID}`)).toBeTruthy();
  });

  // The server finishes the game with the winning throw and would reject a tap for Bob.
  it("disables throw input after the winning throw while its ack is on the way", async () => {
    const winningThrow = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(winningThrow.promise);
    await openGame(buildGame({ alice: 19, bob: 301 }));

    tap("19");
    await waitFor(() => {
      expect(recordThrowMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(false);
    tap("20");
    expect(recordThrowMock).toHaveBeenCalledTimes(1);
  });

  // #95
  it("opens no summary when the winning throw ack arrives after the page moved to another game", async () => {
    const winningThrow = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(winningThrow.promise);
    getGameThrowsIfChangedMock.mockImplementation((id) =>
      Promise.resolve({ ...buildGame({ alice: 19, bob: 301 }), id }),
    );
    const router = createMemoryRouter(
      [
        { path: "/game/:id", element: <GamePage /> },
        { path: "/summary/:id", element: <SummaryProbe /> },
      ],
      { initialEntries: [`/game/${GAME_ID}`] },
    );
    render(<RouterProvider router={router} />);
    await screen.findByRole("group", { name: "Alice" });

    tap("19");
    await waitFor(() => {
      expect(recordThrowMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await router.navigate("/game/5");
    });
    await screen.findByRole("group", { name: "Alice" });

    await act(async () => {
      winningThrow.resolve(buildWinningAck());
      await winningThrow.promise;
    });

    expect(router.state.location.pathname).toBe("/game/5");
    expect(screen.queryByText(/Summary page/)).toBeNull();
  });

  it("opens the summary for a game the server already finished", async () => {
    getGameThrowsIfChangedMock.mockResolvedValue({
      ...buildGame({ alice: 0, bob: 301 }),
      status: "finished",
      winnerId: 1,
    });
    renderGamePage();

    expect(await screen.findByText(`Summary page for game ${GAME_ID}`)).toBeTruthy();
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
    // Alice holds a throw, so Undo is enabled once the load answers.
    const gameWithThrow = buildGameWithAliceThrow();
    setGameData(gameWithThrow);
    renderGamePage();

    expect(within(playerCard("Alice")).getByText("281")).toBeTruthy();
    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(true);

    await act(async () => {
      firstLoad.resolve(gameWithThrow);
      await firstLoad.promise;
    });

    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(false);
  });

  // #98: a cached copy keeps the scoreboard on screen, so the failure needs the status line.
  it("offers Retry when the first load fails while the store shows the game", async () => {
    getGameThrowsIfChangedMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue(buildGame({ alice: 250, bob: 301 }));
    getGameThrowsMock.mockResolvedValue(buildGame({ alice: 250, bob: 301 }));
    setGameData(buildGame({ alice: 281, bob: 301 }));
    renderGamePage();

    const retryButton = await screen.findByRole("button", { name: "Retry" });
    // No tap was lost, so the page says the load failed instead of "not saved".
    expect(screen.getByRole("status").textContent).toContain("Could not load the game.");
    expect(screen.getByRole("status").textContent).not.toMatch(/not saved/i);
    expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(within(playerCard("Alice")).getByText("250")).toBeTruthy();
      expect(screen.getByRole("button", { name: "20" }).hasAttribute("disabled")).toBe(false);
    });
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    // No tap was lost: the failed load sent no throw, so the page has nothing to report.
    expect(screen.getByRole("status").textContent).not.toMatch(/not saved/i);
  });

  // The summary's Undo reopens the game on the server and leaves the finished copy in the store.
  it("loads a game the summary reopened instead of returning to the summary", async () => {
    setGameData({ ...buildGame({ alice: 0, bob: 40 }), status: "finished", winnerId: 1 });
    getGameThrowsIfChangedMock.mockResolvedValue(buildGame({ alice: 20, bob: 40 }));
    renderGamePage();

    await waitFor(() => {
      expect(within(playerCard("Alice")).getByText("20")).toBeTruthy();
    });
    expect(screen.queryByText(/Summary page/)).toBeNull();
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
});

// #321: the server locks the out rule once the game has a throw.
describe("GamePage settings lock", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.sessionStorage.clear();
    gameStore.resetGameStore();
  });

  function settingsButton(): HTMLElement {
    return screen.getByRole("button", { name: "Settings" });
  }

  it("keeps Settings enabled in a started game without throws", async () => {
    await openGame(buildGame({ alice: 301, bob: 301 }));

    expect(settingsButton().hasAttribute("disabled")).toBe(false);
  });

  it("disables Settings after a miss, before and after the server confirms it", async () => {
    const miss = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(miss.promise);
    await openGame(buildGame({ alice: 301, bob: 301 }));

    tap("0");
    expect(settingsButton().hasAttribute("disabled")).toBe(true);

    await act(async () => {
      miss.resolve(buildThrowAck({ alice: 301, bob: 301 }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByText(/syncing/i)).toBeNull();
    expect(settingsButton().hasAttribute("disabled")).toBe(true);
  });

  it("lets the first throw be undone, a miss included, so Settings opens again", async () => {
    recordThrowMock.mockResolvedValueOnce(buildThrowAck({ alice: 301, bob: 301 }));
    undoLastThrowMock.mockResolvedValueOnce(buildGame({ alice: 301, bob: 301 }));
    await openGame(buildGame({ alice: 301, bob: 301 }));

    tap("0");
    await waitFor(() => {
      expect(screen.queryByText(/syncing/i)).toBeNull();
    });
    expect(settingsButton().hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(false);

    tap("Undo");
    await waitFor(() => {
      expect(settingsButton().hasAttribute("disabled")).toBe(false);
    });
    expect(undoLastThrowMock).toHaveBeenCalledTimes(1);
  });

  it("disables Undo once the only throw of a loaded game is undone", async () => {
    undoLastThrowMock.mockReturnValue(new Promise<GameThrowsResponse>(() => {}));
    // The server lists the current round in both currentRoundThrows and roundHistory.
    const game = buildGame({ alice: 301, bob: 301 });
    const [alice] = game.players;
    if (alice === undefined) {
      throw new Error("Expected Alice");
    }
    const miss = { value: 0, isDouble: false, isTriple: false, isBust: false };
    alice.currentRoundThrows = [miss];
    alice.throwsInCurrentRound = 1;
    alice.roundHistory = [{ round: 1, throws: [miss] }];
    game.currentThrowCount = 1;
    await openGame(game);

    tap("Undo");

    expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(true);
    expect(undoLastThrowMock).toHaveBeenCalledTimes(1);
  });

  it("disables Settings after a bust the server has not confirmed yet", async () => {
    recordThrowMock.mockReturnValue(new Promise<ThrowAckResponse>(() => {}));
    await openGame(buildGame({ alice: 10, bob: 301 }));
    expect(settingsButton().hasAttribute("disabled")).toBe(false);

    tap("20");

    expect(within(playerCard("Alice")).getByText("10")).toBeTruthy();
    expect(settingsButton().hasAttribute("disabled")).toBe(true);
  });

  it("disables Settings for a loaded game whose only round was a bust", async () => {
    const game = buildGame({ alice: 301, bob: 301 });
    const [alice] = game.players;
    if (alice === undefined) {
      throw new Error("Expected Alice");
    }
    alice.roundHistory = [
      { round: 1, throws: [{ value: 20, isDouble: false, isTriple: true, isBust: true }] },
    ];
    await openGame(game);

    expect(settingsButton().hasAttribute("disabled")).toBe(true);
  });

  it("enables Settings again once the server confirms the undo of the last throw", async () => {
    const undo = createDeferred<GameThrowsResponse>();
    recordThrowMock.mockResolvedValueOnce(buildThrowAck({ alice: 281, bob: 301 }));
    undoLastThrowMock.mockReturnValueOnce(undo.promise);
    await openGame(buildGame({ alice: 301, bob: 301 }));

    tap("20");
    await waitFor(() => {
      expect(screen.queryByText(/syncing/i)).toBeNull();
    });

    tap("Undo");
    expect(within(playerCard("Alice")).getByText("301")).toBeTruthy();
    // The server still holds the throw until it answers the undo.
    expect(settingsButton().hasAttribute("disabled")).toBe(true);

    await act(async () => {
      undo.resolve(buildGame({ alice: 301, bob: 301 }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(settingsButton().hasAttribute("disabled")).toBe(false);
  });

  it("shows a readable message when the server locked the out rule before this tablet saw a throw", async () => {
    updateGameSettingsMock.mockRejectedValueOnce(
      new ApiError("Conflict", {
        status: 409,
        data: { error: "GAME_OUT_RULE_CHANGE_NOT_ALLOWED" },
      }),
    );
    await openGame(buildGame({ alice: 301, bob: 301 }));

    fireEvent.click(settingsButton());
    tap("Save");

    expect(
      await screen.findByText("The out rule cannot be changed once the game has a throw."),
    ).toBeTruthy();
    expect(screen.queryByText("GAME_OUT_RULE_CHANGE_NOT_ALLOWED")).toBeNull();
  });
});
