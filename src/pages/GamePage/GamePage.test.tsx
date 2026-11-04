// @vitest-environment jsdom
import { FakeEventSource } from "@/test/FakeEventSource";

const getGameThrowsMock = vi.hoisted(() => vi.fn());
const abortGameMock = vi.hoisted(() => vi.fn());
const createRematchGameMock = vi.hoisted(() => vi.fn());
const updateGameSettingsMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api/game", () => ({
  abortGame: (...args: unknown[]) => abortGameMock(...args),
  createRematchGame: (...args: unknown[]) => createRematchGameMock(...args),
  finishGame: vi.fn(),
  getGameThrows: (...args: unknown[]) => getGameThrowsMock(...args),
  recordThrow: vi.fn(),
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
import type { GameThrowsResponse } from "@/shared/api/game";
import * as gameStore from "@/shared/store/game-state";
import * as roomStore from "@/shared/store/game-session";
import { QueryClientWrapper } from "@/test/QueryClientWrapper";
import GamePage from ".";

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
        placement: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [
          { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
        ],
        isGuest: false,
      },
      {
        id: 2,
        name: "Bob",
        score: 281,
        isActive: false,
        isBust: false,
        position: null,
        placement: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [
          { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
        ],
        isGuest: false,
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
    { wrapper: QueryClientWrapper },
  );
}

let originalEventSource: typeof globalThis.EventSource | undefined;
let originalScrollIntoView: typeof HTMLElement.prototype.scrollIntoView | undefined;

beforeAll(() => {
  originalEventSource = globalThis.EventSource;
  originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  vi.stubGlobal("EventSource", FakeEventSource);
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
    FakeEventSource.instances = [];
    window.sessionStorage.clear();
    gameStore.resetGameStore();
    roomStore.resetRoomStore();
    getGameThrowsMock.mockImplementation(() => new Promise(() => {}));
    createRematchGameMock.mockResolvedValue({
      success: true,
      gameId: 5,
      invitationLink: "/invite/5",
    });
    updateGameSettingsMock.mockResolvedValue({
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    });
  });

  it("should open no EventSource while the game is running", async () => {
    getGameThrowsMock.mockResolvedValue(buildGameData({ id: 3 }));

    renderGamePage("/game/3");

    expect(await screen.findByRole("button", { name: "Back to Home" })).toBeTruthy();
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("should render the missing game identifier error when the route param is absent", () => {
    renderGamePage("/game");

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Game not available")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to start" }).getAttribute("href")).toBe("/start");
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });

  it("should render the load error and recover when retry succeeds", async () => {
    getGameThrowsMock
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce(buildGameData({ id: 9 }));

    renderGamePage("/game/9");

    expect(await screen.findByText("Could not load game")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(getGameThrowsMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByText("Could not load game")).toBeNull();
    });

    expect(screen.getByRole("button", { name: "Back to Home" })).toBeTruthy();
  });

  it("should show a dismissible page error when exiting the game fails", async () => {
    getGameThrowsMock.mockResolvedValue(buildGameData({ id: 2 }));
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
    getGameThrowsMock.mockResolvedValue(buildGameData({ id: 2 }));

    renderGamePage("/game/2");

    expect(await screen.findByRole("button", { name: "Back to Home" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));

    expect(await screen.findByText("End Game?")).toBeTruthy();
  });

  it("should disable Yes on the exit overlay while the exit runs", async () => {
    getGameThrowsMock.mockResolvedValue(buildGameData({ id: 2 }));
    abortGameMock.mockReturnValue(new Promise(() => {}));

    renderGamePage("/game/2");

    fireEvent.click(await screen.findByRole("button", { name: "Back to Home" }));
    fireEvent.click(await screen.findByRole("button", { name: "Yes" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Yes" })).toHaveProperty("disabled", true);
    });
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(abortGameMock).toHaveBeenCalledTimes(1);
  });
});
