// @vitest-environment jsdom

const getGameThrowsIfChangedMock = vi.hoisted(() => vi.fn());
const resetGameStateVersionMock = vi.hoisted(() => vi.fn());
const abortGameMock = vi.hoisted(() => vi.fn());
const createRematchMock = vi.hoisted(() => vi.fn());
const finishGameMock = vi.hoisted(() => vi.fn());
const updateGameSettingsMock = vi.hoisted(() => vi.fn());

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

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import type { GameThrowsResponse } from "@/types";
import * as gameStore from "@/shared/store/game-state";
import * as roomStore from "@/shared/store/game-session";
import GamePage from ".";

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

function buildGameData(overrides: Partial<GameThrowsResponse> = {}): GameThrowsResponse {
  return {
    type: "full-state",
    id: 1,
    status: "started",
    currentRound: 2,
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
        position: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [{ throws: [{ value: 20 }] }],
      },
      {
        id: 2,
        name: "Bob",
        score: 281,
        isActive: false,
        isBust: false,
        position: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [{ throws: [{ value: 20 }] }],
      },
    ],
    ...overrides,
  };
}

function renderGamePage(initialEntry: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="*" element={<GamePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

let originalEventSource: typeof globalThis.EventSource | undefined;
let originalScrollIntoView: typeof HTMLElement.prototype.scrollIntoView | undefined;

beforeAll(() => {
  originalEventSource = globalThis.EventSource;
  originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  vi.stubGlobal("EventSource", MockEventSource);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterAll(() => {
  if (originalScrollIntoView !== undefined) {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  }

  if (originalEventSource !== undefined) {
    vi.stubGlobal("EventSource", originalEventSource);
    return;
  }

  Reflect.deleteProperty(globalThis, "EventSource");
});

describe("GamePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    gameStore.resetGameStore();
    roomStore.resetRoomStore();
    roomStore.setLastFinishedGameSummary(null);
    getGameThrowsIfChangedMock.mockResolvedValue(null);
    createRematchMock.mockResolvedValue({
      success: true,
      gameId: 5,
      invitationLink: "/invite/5",
    });
    finishGameMock.mockResolvedValue([]);
    updateGameSettingsMock.mockResolvedValue({
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    });
  });

  it("should render the missing game identifier error when the route param is absent", () => {
    renderGamePage("/game");

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Game not available")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to start" }).getAttribute("href")).toBe("/start");
    expect(getGameThrowsIfChangedMock).not.toHaveBeenCalled();
  });

  it("should render the load error and recover when retry succeeds", async () => {
    getGameThrowsIfChangedMock
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce(buildGameData({ id: 9 }));

    renderGamePage("/game/9");

    expect(await screen.findByText("Could not load game")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(getGameThrowsIfChangedMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByText("Could not load game")).toBeNull();
    });

    expect(screen.getByRole("button", { name: "Back to Home" })).toBeTruthy();
  });

  it("should show a dismissible page error when exiting the game fails", async () => {
    getGameThrowsIfChangedMock.mockResolvedValue(buildGameData({ id: 2 }));
    abortGameMock.mockRejectedValue(new Error("Abort failed"));

    renderGamePage("/game/2");

    expect(await screen.findByRole("button", { name: "Back to Home" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    fireEvent.click(await screen.findByRole("button", { name: "Yes" }));

    expect(await screen.findByText("Game action failed")).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    });

    await waitFor(() => {
      expect(screen.queryByText("Game action failed")).toBeNull();
    });
  });

  it("should open the exit overlay when the back button is clicked", async () => {
    getGameThrowsIfChangedMock.mockResolvedValue(buildGameData({ id: 2 }));

    renderGamePage("/game/2");

    expect(await screen.findByRole("button", { name: "Back to Home" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));

    expect(await screen.findByText("End Game?")).toBeTruthy();
  });
});
