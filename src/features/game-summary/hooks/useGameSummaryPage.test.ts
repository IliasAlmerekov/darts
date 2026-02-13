// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameSummaryPage } from "./useGameSummaryPage";
import { playSound } from "@/lib/soundPlayer";

const navigateMock = vi.fn();
const getFinishedGameMock = vi.fn();
const createRematchMock = vi.fn();
const startGameMock = vi.fn();
const undoLastThrowMock = vi.fn();
const setGameDataMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ state: { finishedGameId: 42 } }),
  useParams: () => ({ id: "42" }),
}));

vi.mock("@/shared/providers/GameFlowPortProvider", () => ({
  useGameFlowPort: () => ({
    getFinishedGame: (...args: unknown[]) => getFinishedGameMock(...args),
    createRematch: (...args: unknown[]) => createRematchMock(...args),
    startGame: (...args: unknown[]) => startGameMock(...args),
    undoLastThrow: (...args: unknown[]) => undoLastThrowMock(...args),
  }),
}));

vi.mock("@/stores", () => ({
  $gameSettings: { key: "gameSettings" },
  setInvitation: vi.fn(),
  setLastFinishedGameId: vi.fn(),
  resetRoomStore: vi.fn(),
  setGameData: (...args: unknown[]) => setGameDataMock(...args),
}));

vi.mock("@nanostores/react", () => ({
  useStore: () => ({
    startScore: 301,
    doubleOut: false,
    tripleOut: false,
  }),
}));

vi.mock("@/lib/soundPlayer", () => ({
  playSound: vi.fn(),
}));

describe("useGameSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setGameDataMock.mockReset();
    getFinishedGameMock.mockResolvedValue([]);
    startGameMock.mockResolvedValue(undefined);
    createRematchMock.mockResolvedValue({
      success: true,
      gameId: 77,
      invitationLink: "/invite/77",
    });
    undoLastThrowMock.mockResolvedValue({
      id: 42,
      status: "started",
      currentRound: 1,
      activePlayerId: 1,
      currentThrowCount: 0,
      winnerId: null,
      settings: { startScore: 301, doubleOut: false, tripleOut: false },
      players: [],
    });
  });

  it("undoes last throw and navigates back to game route", async () => {
    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(setGameDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        status: "started",
      }),
    );
    expect(playSound).toHaveBeenCalledWith("undo");
    expect(navigateMock).toHaveBeenCalledWith("/game/42", {
      state: { skipFinishOverlay: true },
    });
  });

  it("does not navigate when undo fails", async () => {
    undoLastThrowMock.mockRejectedValueOnce(new Error("undo failed"));

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(setGameDataMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalledWith("/game/42");
  });

  it("starts rematch game immediately and navigates to game route", async () => {
    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(createRematchMock).toHaveBeenCalledWith(42);
    expect(startGameMock).toHaveBeenCalledWith(77, {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
      round: 1,
      status: "started",
    });
    expect(navigateMock).toHaveBeenCalledWith("/game/77");
  });

  it("does not navigate when rematch response misses game id", async () => {
    createRematchMock.mockResolvedValueOnce({
      success: false,
      gameId: 0,
      invitationLink: "",
    });

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(navigateMock).not.toHaveBeenCalledWith("/start/77");
  });
});
