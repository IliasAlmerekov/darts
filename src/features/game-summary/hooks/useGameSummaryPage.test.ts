// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameSummaryPage } from "./useGameSummaryPage";
import { ApiError } from "@/lib/api/errors";
import { playSound } from "@/lib/soundPlayer";

const navigateMock = vi.fn();
const getFinishedGameMock = vi.fn();
const createRematchMock = vi.fn();
const reopenGameMock = vi.fn();
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
    reopenGame: (...args: unknown[]) => reopenGameMock(...args),
    undoLastThrow: (...args: unknown[]) => undoLastThrowMock(...args),
  }),
}));

vi.mock("@/stores", () => ({
  setInvitation: vi.fn(),
  setLastFinishedGameId: vi.fn(),
  resetRoomStore: vi.fn(),
  setGameData: (...args: unknown[]) => setGameDataMock(...args),
}));

vi.mock("@/lib/soundPlayer", () => ({
  playSound: vi.fn(),
}));

describe("useGameSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setGameDataMock.mockReset();
    getFinishedGameMock.mockResolvedValue([]);
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
    reopenGameMock.mockResolvedValue({
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

  it("reopens finished game and navigates back to game route", async () => {
    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(reopenGameMock).toHaveBeenCalledWith(42);
    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(setGameDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        status: "started",
      }),
    );
    expect(playSound).toHaveBeenCalledWith("undo");
    expect(navigateMock).toHaveBeenCalledWith("/game/42");
  });

  it("continues with undo when reopen reports started status conflict", async () => {
    reopenGameMock.mockRejectedValueOnce(
      new ApiError("Request failed", {
        status: 409,
        data: {
          error: "GAME_REOPEN_NOT_ALLOWED",
          message: "Game can only be reopened from finished status. Current status: started.",
        },
      }),
    );
    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(reopenGameMock).toHaveBeenCalledWith(42);
    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(setGameDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        status: "started",
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith("/game/42");
  });

  it("does not navigate when reopen fails with non-conflict", async () => {
    reopenGameMock.mockRejectedValueOnce(
      new ApiError("Request failed", {
        status: 422,
        data: {
          error: "GAME_REOPEN_INVALID_STATE",
          message: "Unable to reopen game.",
        },
      }),
    );

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(reopenGameMock).toHaveBeenCalledWith(42);
    expect(undoLastThrowMock).not.toHaveBeenCalled();
    expect(setGameDataMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalledWith("/game/42");
  });

  it("skips extra undo when reopen already restores active game state", async () => {
    reopenGameMock.mockResolvedValueOnce({
      id: 42,
      status: "started",
      currentRound: 6,
      activePlayerId: 1,
      currentThrowCount: 0,
      winnerId: null,
      settings: { startScore: 301, doubleOut: false, tripleOut: false },
      players: [
        {
          id: 1,
          name: "P1",
          score: 50,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
        {
          id: 2,
          name: "P2",
          score: 32,
          isActive: false,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
      ],
    });

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(reopenGameMock).toHaveBeenCalledWith(42);
    expect(undoLastThrowMock).not.toHaveBeenCalled();
    expect(setGameDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        status: "started",
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith("/game/42");
  });
});
