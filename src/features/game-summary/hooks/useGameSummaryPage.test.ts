// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameSummaryPage } from "./useGameSummaryPage";
import { ApiError } from "@/lib/api/errors";

const navigateMock = vi.fn();
const getFinishedGameMock = vi.fn();
const createRematchMock = vi.fn();
const reopenGameMock = vi.fn();
const undoLastThrowMock = vi.fn();

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
}));

vi.mock("@/lib/soundPlayer", () => ({
  playSound: vi.fn(),
}));

describe("useGameSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(reopenGameMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/game/42");
  });

  it("calls reopen after undo when game is still finished", async () => {
    undoLastThrowMock.mockResolvedValueOnce({
      id: 42,
      status: "finished",
      currentRound: 1,
      activePlayerId: 1,
      currentThrowCount: 0,
      winnerId: null,
      settings: { startScore: 301, doubleOut: false, tripleOut: false },
      players: [],
    });

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(reopenGameMock).toHaveBeenCalledWith(42);
    expect(navigateMock).toHaveBeenCalledWith("/game/42");
  });

  it("navigates back to game when reopen reports started status conflict", async () => {
    undoLastThrowMock.mockResolvedValueOnce({
      id: 42,
      status: "finished",
      currentRound: 1,
      activePlayerId: 1,
      currentThrowCount: 0,
      winnerId: null,
      settings: { startScore: 301, doubleOut: false, tripleOut: false },
      players: [],
    });
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

    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(reopenGameMock).toHaveBeenCalledWith(42);
    expect(navigateMock).toHaveBeenCalledWith("/game/42");
  });
});
