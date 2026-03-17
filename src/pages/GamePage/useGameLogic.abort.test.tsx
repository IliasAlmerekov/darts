// @vitest-environment jsdom

const navigateMock = vi.hoisted(() => vi.fn());
const getGameThrowsIfChangedMock = vi.hoisted(() => vi.fn());
const resetGameStateVersionMock = vi.hoisted(() => vi.fn());
const finishGameMock = vi.hoisted(() => vi.fn());
const abortGameMock = vi.hoisted(() => vi.fn());
const createRematchMock = vi.hoisted(() => vi.fn());
const updateGameSettingsMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useLocation: () => ({ state: null }),
    useNavigate: () => navigateMock,
    useParams: () => ({ id: "1" }),
  };
});

vi.mock("@/shared/api/game", () => ({
  abortGame: (...args: unknown[]) => abortGameMock(...args),
  createRematch: (...args: unknown[]) => createRematchMock(...args),
  finishGame: (...args: unknown[]) => finishGameMock(...args),
  getGameThrows: vi.fn(),
  getGameThrowsIfChanged: (...args: unknown[]) => getGameThrowsIfChangedMock(...args),
  recordThrow: vi.fn(),
  resetGameStateVersion: (...args: unknown[]) => resetGameStateVersionMock(...args),
  setGameStateVersion: vi.fn(),
  undoLastThrow: vi.fn(),
  updateGameSettings: (...args: unknown[]) => updateGameSettingsMock(...args),
}));

vi.mock("@/shared/services/browser/soundPlayer", () => ({
  playSound: vi.fn(),
  unlockSounds: vi.fn(),
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import type { GameSummaryResponse, GameThrowsResponse } from "@/types";
import * as gameStore from "@/shared/store/game-state";
import * as roomStore from "@/shared/store/game-session";
import { useGameLogic } from "./useGameLogic";

class MockEventSource implements EventSource {
  static CONNECTING = 0 as const;
  static OPEN = 1 as const;
  static CLOSED = 2 as const;

  readonly CONNECTING = 0 as const;
  readonly OPEN = 1 as const;
  readonly CLOSED = 2 as const;

  onerror: ((this: EventSource, event: Event) => unknown) | null = null;
  onmessage: ((this: EventSource, event: MessageEvent<string>) => unknown) | null = null;
  onopen: ((this: EventSource, event: Event) => unknown) | null = null;
  readyState: 0 | 1 | 2 = MockEventSource.CONNECTING;
  url: string;
  withCredentials: boolean;

  constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
    this.url = String(url);
    this.withCredentials = eventSourceInitDict?.withCredentials ?? false;
  }

  addEventListener(): void {}

  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }

  dispatchEvent(): boolean {
    return true;
  }

  removeEventListener(): void {}
}

type Deferred<T> = {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let rejectPromise: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((_resolve, reject) => {
    rejectPromise = reject;
  });

  return { promise, reject: rejectPromise };
}

function createAbortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

function buildAutoFinishGameData(): GameThrowsResponse {
  return {
    type: "full-state",
    id: 1,
    status: "started",
    currentRound: 4,
    activePlayerId: 1,
    currentThrowCount: 0,
    winnerId: null,
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
    players: [
      {
        id: 1,
        name: "P1",
        score: 26,
        isActive: true,
        isBust: false,
        position: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [{ throws: [{ value: 20 }] }],
      },
      {
        id: 2,
        name: "P2",
        score: 0,
        isActive: false,
        isBust: false,
        position: 1,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [{ throws: [{ value: 20 }] }],
      },
    ],
  };
}

let originalEventSource: typeof globalThis.EventSource | undefined;

beforeAll(() => {
  originalEventSource = globalThis.EventSource;
  vi.stubGlobal("EventSource", MockEventSource);
});

afterAll(() => {
  if (originalEventSource !== undefined) {
    vi.stubGlobal("EventSource", originalEventSource);
    return;
  }

  Reflect.deleteProperty(globalThis, "EventSource");
});

describe("useGameLogic auto-finish abort handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    gameStore.resetGameStore();
    roomStore.resetRoomStore();
    roomStore.setLastFinishedGameSummary(null);
    getGameThrowsIfChangedMock.mockResolvedValue(buildAutoFinishGameData());
    createRematchMock.mockResolvedValue({
      success: true,
      gameId: 3,
      invitationLink: "/invite/3",
    });
    updateGameSettingsMock.mockResolvedValue({
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    });
  });

  it("should navigate to summary and cache the finish payload when auto-finish completes", async () => {
    const summaryPayload: GameSummaryResponse = [
      {
        playerId: 2,
        username: "Winner",
        position: 1,
        roundsPlayed: 3,
        roundAverage: 55.5,
      },
    ];

    finishGameMock.mockResolvedValue(summaryPayload);

    renderHook(() => useGameLogic());

    await waitFor(() => {
      expect(finishGameMock).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/summary/1", {
        state: {
          finishedGameId: 1,
          summary: summaryPayload,
        },
      });
    });

    expect(roomStore.$lastFinishedGameSummary.get()).toEqual({
      gameId: 1,
      summary: summaryPayload,
    });
    expect(resetGameStateVersionMock).toHaveBeenCalledWith(1);
  });

  it("should pass AbortSignal to finishGame and abort it when unmounted", async () => {
    finishGameMock.mockImplementation(() => new Promise(() => {}));

    const { unmount } = renderHook(() => useGameLogic());

    await waitFor(() => {
      expect(finishGameMock).toHaveBeenCalledTimes(1);
    });

    const finishSignal = finishGameMock.mock.calls[0]?.[1] as AbortSignal | undefined;

    expect(finishSignal).toBeInstanceOf(AbortSignal);
    expect(finishSignal?.aborted).toBe(false);

    unmount();

    expect(finishSignal?.aborted).toBe(true);
  });

  it("should ignore AbortError from auto-finish when the component has unmounted", async () => {
    const pendingFinish = deferred<never>();

    finishGameMock.mockReturnValue(pendingFinish.promise);

    const { unmount } = renderHook(() => useGameLogic());

    await waitFor(() => {
      expect(finishGameMock).toHaveBeenCalledTimes(1);
    });

    unmount();
    pendingFinish.reject(createAbortError());

    await act(async () => {
      await pendingFinish.promise.catch(() => undefined);
    });

    expect(navigateMock).not.toHaveBeenCalled();
    expect(roomStore.$lastFinishedGameSummary.get()).toBeNull();
  });

  it("should not navigate to summary while auto-finish is still pending", async () => {
    finishGameMock.mockImplementation(() => new Promise(() => {}));

    const { unmount } = renderHook(() => useGameLogic());

    await waitFor(() => {
      expect(finishGameMock).toHaveBeenCalledTimes(1);
    });

    expect(navigateMock).not.toHaveBeenCalled();
    expect(roomStore.$lastFinishedGameSummary.get()).toBeNull();

    unmount();
  });
});
