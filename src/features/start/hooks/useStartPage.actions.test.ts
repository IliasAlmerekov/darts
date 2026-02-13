// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStartPage } from "./useStartPage";

const navigateMock = vi.fn();
const setCurrentGameIdMock = vi.fn();
const setInvitationMock = vi.fn();
const setGameDataMock = vi.fn();

const gameFlowMock = {
  updatePlayerOrder: vi.fn(),
  leaveRoom: vi.fn(),
  getGameThrows: vi.fn(),
  getInvitation: vi.fn(),
  startGame: vi.fn(),
  createRoom: vi.fn(),
  addGuestPlayer: vi.fn(),
};

const storeValues = new Map<string, unknown>();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({}),
}));

const emptyPlayers: never[] = [];
const gamePlayersResult = { players: emptyPlayers, count: 0 };

vi.mock("@/hooks/useGamePlayers", () => ({
  useGamePlayers: () => gamePlayersResult,
}));

vi.mock("@/shared/providers/GameFlowPortProvider", () => ({
  useGameFlowPort: () => gameFlowMock,
}));

vi.mock("@nanostores/react", () => ({
  useStore: (store: { key?: string }) => storeValues.get(store.key ?? ""),
}));

vi.mock("@/stores", () => ({
  $lastFinishedGameId: { key: "lastFinishedGameId" },
  $invitation: { key: "invitation" },
  $gameSettings: { key: "gameSettings" },
  $currentGameId: { key: "currentGameId" },
  setCurrentGameId: (...args: unknown[]) => setCurrentGameIdMock(...args),
  setInvitation: (...args: unknown[]) => setInvitationMock(...args),
}));

vi.mock("@/stores/game", () => ({
  setGameData: (...args: unknown[]) => setGameDataMock(...args),
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

describe("useStartPage action guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeValues.set("gameSettings", null);
    storeValues.set("lastFinishedGameId", null);
    storeValues.set("currentGameId", null);
    storeValues.set("invitation", null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prevents duplicate startGame calls while first request is pending", async () => {
    storeValues.set("invitation", { gameId: 10, invitationLink: "/invite/10" });

    const pending = deferred<void>();
    gameFlowMock.startGame.mockReturnValueOnce(pending.promise);

    const audioPlayMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("Audio", function MockAudio(this: { volume: number; play: () => Promise<void> }) {
      this.volume = 1;
      this.play = audioPlayMock;
    } as unknown as typeof Audio);

    const { result } = renderHook(() => useStartPage());

    let firstCall = Promise.resolve();
    let secondCall = Promise.resolve();
    await act(async () => {
      firstCall = result.current.handleStartGame();
      secondCall = result.current.handleStartGame();
    });

    expect(gameFlowMock.startGame).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await firstCall;
      await secondCall;
    });

    expect(navigateMock).toHaveBeenCalledWith("/game/10");
  });

  it("prevents duplicate createRoom calls while first request is pending", async () => {
    storeValues.set("lastFinishedGameId", 77);
    const pending = deferred<{ gameId: number; invitationLink: string }>();
    gameFlowMock.createRoom.mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() => useStartPage());

    let firstCall = Promise.resolve();
    let secondCall = Promise.resolve();
    await act(async () => {
      firstCall = result.current.handleCreateRoom();
      secondCall = result.current.handleCreateRoom();
    });

    expect(gameFlowMock.createRoom).toHaveBeenCalledTimes(1);
    expect(gameFlowMock.createRoom).toHaveBeenCalledWith({ previousGameId: 77 });

    await act(async () => {
      pending.resolve({ gameId: 55, invitationLink: "/invite/55" });
      await firstCall;
      await secondCall;
    });

    expect(setInvitationMock).toHaveBeenCalledWith({
      gameId: 55,
      invitationLink: "/invite/55",
    });
    expect(navigateMock).toHaveBeenCalledWith("/start/55");
  });
});
