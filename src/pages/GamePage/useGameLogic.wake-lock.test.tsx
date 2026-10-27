// @vitest-environment jsdom

const navigateMock = vi.hoisted(() => vi.fn());
const getGameThrowsIfChangedMock = vi.hoisted(() => vi.fn());
const resetGameStateVersionMock = vi.hoisted(() => vi.fn());
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
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameThrowsResponse } from "@/types";
import * as gameStore from "@/shared/store/game-state";
import * as roomStore from "@/shared/store/game-session";
import { QueryClientWrapper } from "@/test/QueryClientWrapper";
import { useGameLogic } from "./useGameLogic";

function setNavigatorWakeLock(request: (type?: WakeLockType) => Promise<WakeLockSentinel>): void {
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: {
      request,
    } satisfies Pick<WakeLock, "request">,
  });
}

function buildGameData(status: GameThrowsResponse["status"]): GameThrowsResponse {
  return {
    type: "full-state",
    id: 1,
    status,
    currentRound: status === "started" ? 2 : 1,
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
        name: "Alice",
        score: 301,
        isActive: true,
        isBust: false,
        isGuest: false,
        position: null,
        placement: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory:
          status === "started"
            ? [{ throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] }]
            : [],
      },
      {
        id: 2,
        name: "Bob",
        score: status === "finished" ? 0 : 281,
        isActive: false,
        isBust: false,
        isGuest: false,
        position: status === "finished" ? 1 : null,
        placement: status === "finished" ? 1 : null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory:
          status === "started"
            ? [{ throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] }]
            : [],
      },
    ],
  };
}

function createMockWakeLockSentinel(release: () => Promise<void>): WakeLockSentinel {
  return {
    type: "screen",
    released: false,
    onrelease: null,
    release,
    addEventListener: (
      _type: string,
      _listener: EventListenerOrEventListenerObject | null,
      _options?: boolean | AddEventListenerOptions,
    ) => {},
    removeEventListener: (
      _type: string,
      _listener: EventListenerOrEventListenerObject | null,
      _options?: boolean | EventListenerOptions,
    ) => {},
    dispatchEvent: (_event: Event) => true,
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

let initialWakeLockDescriptor: PropertyDescriptor | undefined;
let hasOwnWakeLockDescriptor = false;
function restoreNavigatorWakeLock(): void {
  if (hasOwnWakeLockDescriptor && initialWakeLockDescriptor) {
    Object.defineProperty(navigator, "wakeLock", initialWakeLockDescriptor);
    return;
  }

  Reflect.deleteProperty(navigator, "wakeLock");
}

afterAll(() => {
  restoreNavigatorWakeLock();
});

describe("useGameLogic wake-lock wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    gameStore.resetGameStore();
    roomStore.resetRoomStore();
    getGameThrowsIfChangedMock.mockResolvedValue(null);
    createRematchMock.mockResolvedValue({
      success: true,
      gameId: 4,
      invitationLink: "/invite/4",
    });
    updateGameSettingsMock.mockResolvedValue({
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    });
    hasOwnWakeLockDescriptor = Object.prototype.hasOwnProperty.call(navigator, "wakeLock");
    initialWakeLockDescriptor = Object.getOwnPropertyDescriptor(navigator, "wakeLock");
    restoreNavigatorWakeLock();
  });

  it("should acquire a screen wake lock when the fetched game is started", async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const requestMock = vi.fn().mockResolvedValue(createMockWakeLockSentinel(releaseMock));

    setNavigatorWakeLock(requestMock);
    getGameThrowsIfChangedMock.mockResolvedValue(buildGameData("started"));

    const { result } = renderHook(() => useGameLogic(), { wrapper: QueryClientWrapper });

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("screen");
    });

    expect(result.current.gameId).toBe(1);
    expect(result.current.handleThrow).toBeTypeOf("function");
    expect(result.current.handleUndo).toBeTypeOf("function");
    expect(result.current.handleRetry).toBeTypeOf("function");
  });

  it.each([
    ["missing game data", null],
    ["lobby status", buildGameData("lobby")],
    ["finished status", buildGameData("finished")],
  ] as const)("should not acquire a wake lock for %s", async (_label, gameData) => {
    const requestMock = vi
      .fn()
      .mockResolvedValue(createMockWakeLockSentinel(vi.fn().mockResolvedValue(undefined)));

    setNavigatorWakeLock(requestMock);
    getGameThrowsIfChangedMock.mockResolvedValue(gameData);

    renderHook(() => useGameLogic(), { wrapper: QueryClientWrapper });
    await act(async () => {
      await flushMicrotasks();
    });

    expect(requestMock).not.toHaveBeenCalled();
  });

  it("should release the wake lock when the game transitions from started to finished", async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const requestMock = vi.fn().mockResolvedValue(createMockWakeLockSentinel(releaseMock));

    setNavigatorWakeLock(requestMock);
    getGameThrowsIfChangedMock.mockResolvedValue(buildGameData("started"));

    renderHook(() => useGameLogic(), { wrapper: QueryClientWrapper });

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("screen");
    });

    act(() => {
      gameStore.setGameData(buildGameData("finished"));
    });

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });
  });

  it("should acquire the wake lock when the game transitions from lobby to started", async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const requestMock = vi.fn().mockResolvedValue(createMockWakeLockSentinel(releaseMock));

    setNavigatorWakeLock(requestMock);
    getGameThrowsIfChangedMock.mockResolvedValue(buildGameData("lobby"));

    renderHook(() => useGameLogic(), { wrapper: QueryClientWrapper });

    await waitFor(() => {
      expect(gameStore.$gameData.get()?.status).toBe("lobby");
    });

    expect(requestMock).not.toHaveBeenCalled();

    act(() => {
      gameStore.setGameData(buildGameData("started"));
    });

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("screen");
    });
  });

  it("should release the wake lock when the hook unmounts", async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const requestMock = vi.fn().mockResolvedValue(createMockWakeLockSentinel(releaseMock));

    setNavigatorWakeLock(requestMock);
    getGameThrowsIfChangedMock.mockResolvedValue(buildGameData("started"));

    const { unmount } = renderHook(() => useGameLogic(), { wrapper: QueryClientWrapper });

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("screen");
    });

    unmount();

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });
  });
});
