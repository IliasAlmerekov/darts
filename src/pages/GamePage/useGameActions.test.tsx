// @vitest-environment jsdom

const updateGameSettingsMock = vi.hoisted(() => vi.fn());
const clientLoggerErrorMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/shared/api/game", () => ({
  abortGame: vi.fn(),
  createRematch: vi.fn(),
  getGameThrows: vi.fn(),
  updateGameSettings: (...args: unknown[]) => updateGameSettingsMock(...args),
}));

vi.mock("@/shared/store", () => ({
  resetRoomStore: vi.fn(),
  setInvitation: vi.fn(),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: clientLoggerErrorMock, warn: vi.fn() },
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameSettingsResponse, GameThrowsResponse } from "@/types";
import { ApiError } from "@/shared/api";
import { abortGame, createRematch, getGameThrows } from "@/shared/api/game";
import { resetRoomStore, setInvitation } from "@/shared/store";
import { useGameExitFlow, useGameSettingsFlow } from "./useGameActions";

function createGameData(): GameThrowsResponse {
  return {
    type: "full-state",
    id: 42,
    status: "started",
    currentRound: 2,
    activePlayerId: 7,
    currentThrowCount: 1,
    winnerId: null,
    players: [
      {
        id: 7,
        name: "P1",
        score: 261,
        isActive: true,
        isBust: false,
        position: null,
        throwsInCurrentRound: 1,
        currentRoundThrows: [{ value: 20, isDouble: true, isTriple: false, isBust: false }],
        roundHistory: [],
        isGuest: false,
      },
    ],
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
  };
}

describe("useGameSettingsFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should merge compact settings response into game state when settings are saved", async () => {
    const updateGameSettingsStore = vi.fn();
    const updatedSettings: GameSettingsResponse = {
      gameId: 42,
      status: "started",
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    };
    updateGameSettingsMock.mockResolvedValueOnce(updatedSettings);

    const { result } = renderHook(() =>
      useGameSettingsFlow({
        gameData: createGameData(),
        gameId: 42,
        updateGameSettings: updateGameSettingsStore,
      }),
    );

    act(() => {
      result.current.handleOpenSettings();
    });

    await act(async () => {
      await result.current.handleSaveSettings({
        doubleOut: true,
        tripleOut: false,
      });
    });

    await waitFor(() => {
      expect(updateGameSettingsMock).toHaveBeenCalledWith(42, {
        doubleOut: true,
        tripleOut: false,
      });
    });

    expect(updateGameSettingsStore).toHaveBeenCalledWith(updatedSettings);
    expect(result.current.isSettingsOpen).toBe(false);
    expect(result.current.settingsError).toBeNull();
  });
});

describe("useGameExitFlow", () => {
  const abortNotAllowed = () =>
    new ApiError("Conflict", { status: 409, data: { error: "GAME_ABORT_NOT_ALLOWED" } });

  function renderExitFlow(gameId = 42) {
    const navigate = vi.fn();
    const setPageError = vi.fn();
    const { rerender, result, unmount } = renderHook(
      (props: { gameId: number }) =>
        useGameExitFlow({ gameId: props.gameId, navigate, setPageError }),
      { initialProps: { gameId } },
    );
    return { navigate, rerender, result, setPageError, unmount };
  }

  async function startExit(handleExitGame: () => Promise<void>) {
    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = handleExitGame();
      await Promise.resolve();
    });
    return { pending };
  }

  function deferred<T>() {
    let resolve: (value: T) => void = () => {};
    let reject: (reason: unknown) => void = () => {};
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, reject, resolve };
  }

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should abort, create a rematch and open the new lobby when a started game is left", async () => {
    vi.mocked(abortGame).mockResolvedValueOnce({ success: true, message: "ok" });
    vi.mocked(createRematch).mockResolvedValueOnce({
      success: true,
      gameId: 43,
      invitationLink: "https://example.test/join/abc",
    });
    const { navigate, result, setPageError } = renderExitFlow();

    await act(async () => {
      await result.current.handleExitGame();
    });

    expect(abortGame).toHaveBeenCalledWith(42);
    expect(createRematch).toHaveBeenCalledWith(42);
    expect(setInvitation).toHaveBeenCalledWith({
      gameId: 43,
      invitationLink: "https://example.test/join/abc",
    });
    expect(navigate).toHaveBeenCalledWith("/start/43");
    expect(setPageError).not.toHaveBeenCalledWith(expect.any(String));
  });

  it("should open the summary without error or rematch when abort is refused for a finished game", async () => {
    vi.mocked(abortGame).mockRejectedValueOnce(abortNotAllowed());
    vi.mocked(getGameThrows).mockResolvedValueOnce({
      ...createGameData(),
      status: "finished",
      winnerId: 7,
    });
    const { navigate, result, setPageError } = renderExitFlow();

    await act(async () => {
      await result.current.handleExitGame();
    });

    expect(getGameThrows).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    expect(createRematch).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/summary/42", {
      state: { finishedGameId: 42 },
    });
    expect(setPageError).not.toHaveBeenCalledWith(expect.any(String));
  });

  it.each([
    [
      "the game is still in the lobby",
      () => Promise.resolve<GameThrowsResponse>({ ...createGameData(), status: "lobby" }),
    ],
    ["the fresh read fails", () => Promise.reject<GameThrowsResponse>(new Error("offline"))],
  ])("should keep the page error when abort is refused and %s", async (_name, readGame) => {
    vi.mocked(abortGame).mockRejectedValueOnce(abortNotAllowed());
    vi.mocked(getGameThrows).mockImplementationOnce(readGame);
    const { navigate, result, setPageError } = renderExitFlow();

    await act(async () => {
      await result.current.handleExitGame();
    });

    expect(createRematch).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(setPageError).toHaveBeenLastCalledWith(
      "This game can no longer be left. Please reload the page.",
    );
    expect(clientLoggerErrorMock).toHaveBeenCalledWith(
      "game.exit.failed",
      expect.objectContaining({ context: { gameId: 42 } }),
    );
  });

  describe("when Yes is pressed again while an exit runs", () => {
    it("should send one abort, one rematch and one navigation for a double call", async () => {
      const abort = deferred<{ success: boolean; message: string }>();
      const rematch = deferred<{ success: boolean; gameId: number; invitationLink: string }>();
      vi.mocked(abortGame).mockReturnValue(abort.promise);
      vi.mocked(createRematch).mockReturnValue(rematch.promise);
      const { navigate, result } = renderExitFlow();

      let calls: Promise<void>[] = [];
      await act(async () => {
        calls = [result.current.handleExitGame(), result.current.handleExitGame()];
        await Promise.resolve();
      });
      await act(async () => {
        abort.resolve({ success: true, message: "ok" });
        await Promise.resolve();
        rematch.resolve({ success: true, gameId: 43, invitationLink: "https://example.test/j" });
        await Promise.all(calls);
      });

      expect(abortGame).toHaveBeenCalledTimes(1);
      expect(createRematch).toHaveBeenCalledTimes(1);
      expect(setInvitation).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith("/start/43");
      expect(result.current.isExitPending).toBe(true);

      await act(async () => {
        await result.current.handleExitGame();
      });
      expect(abortGame).toHaveBeenCalledTimes(1);
      expect(createRematch).toHaveBeenCalledTimes(1);
    });

    it("should release the lock and allow a retry when abort fails", async () => {
      vi.mocked(abortGame).mockRejectedValueOnce(new Error("offline"));
      const { result, setPageError } = renderExitFlow();

      await act(async () => {
        await result.current.handleExitGame();
      });

      expect(result.current.isExitPending).toBe(false);
      expect(setPageError).toHaveBeenCalledWith(expect.any(String));

      vi.mocked(abortGame).mockRejectedValueOnce(new Error("offline"));
      await act(async () => {
        await result.current.handleExitGame();
      });

      expect(abortGame).toHaveBeenCalledTimes(2);
    });

    it("should navigate to the summary once and ignore a repeated call for a finished game", async () => {
      vi.mocked(abortGame).mockRejectedValue(abortNotAllowed());
      const read = deferred<GameThrowsResponse>();
      vi.mocked(getGameThrows).mockReturnValue(read.promise);
      const { navigate, result } = renderExitFlow();

      let first: Promise<void> = Promise.resolve();
      await act(async () => {
        first = result.current.handleExitGame();
        await Promise.resolve();
      });
      await act(async () => {
        await result.current.handleExitGame();
      });
      await act(async () => {
        read.resolve({ ...createGameData(), status: "finished", winnerId: 7 });
        await first;
      });
      await act(async () => {
        await result.current.handleExitGame();
      });

      expect(abortGame).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith("/summary/42", { state: { finishedGameId: 42 } });
      expect(result.current.isExitPending).toBe(true);
    });

    it("should allow a new exit when the game id changes", async () => {
      vi.mocked(abortGame).mockReturnValue(new Promise(() => {}));
      const { rerender, result } = renderExitFlow();

      await act(async () => {
        void result.current.handleExitGame();
        await Promise.resolve();
      });
      rerender({ gameId: 43 });
      expect(result.current.isExitPending).toBe(false);
      await act(async () => {
        void result.current.handleExitGame();
        await Promise.resolve();
      });

      expect(abortGame).toHaveBeenNthCalledWith(1, 42);
      expect(abortGame).toHaveBeenNthCalledWith(2, 43);
    });

    it("should allow an exit for a game the page returns to after leaving it mid-exit", async () => {
      const abort = deferred<{ success: boolean; message: string }>();
      vi.mocked(abortGame).mockReturnValueOnce(abort.promise);
      const { rerender, result } = renderExitFlow();

      let stale: Promise<void> = Promise.resolve();
      await act(async () => {
        stale = result.current.handleExitGame();
        await Promise.resolve();
      });
      rerender({ gameId: 43 });
      rerender({ gameId: 42 });
      await act(async () => {
        abort.reject(new Error("offline"));
        await stale;
      });

      expect(result.current.isExitPending).toBe(false);
      vi.mocked(abortGame).mockReturnValueOnce(new Promise(() => {}));
      await act(async () => {
        void result.current.handleExitGame();
        await Promise.resolve();
      });
      expect(abortGame).toHaveBeenCalledTimes(2);
      expect(abortGame).toHaveBeenLastCalledWith(42);
    });

    it("should keep a game locked when the page returns to it while another game exits", async () => {
      vi.mocked(abortGame).mockReturnValue(new Promise(() => {}));
      const { rerender, result } = renderExitFlow(42);

      await act(async () => {
        void result.current.handleExitGame();
        await Promise.resolve();
      });
      rerender({ gameId: 43 });
      await act(async () => {
        void result.current.handleExitGame();
        await Promise.resolve();
      });
      rerender({ gameId: 42 });

      expect(result.current.isExitPending).toBe(true);
      await act(async () => {
        await result.current.handleExitGame();
      });
      expect(abortGame).toHaveBeenCalledTimes(2);
    });

    it("should not release another game's lock when a stale exit fails", async () => {
      const abort42 = deferred<{ success: boolean; message: string }>();
      vi.mocked(abortGame)
        .mockReturnValueOnce(abort42.promise)
        .mockReturnValueOnce(new Promise(() => {}));
      const { rerender, result } = renderExitFlow(42);

      let stale: Promise<void> = Promise.resolve();
      await act(async () => {
        stale = result.current.handleExitGame();
        await Promise.resolve();
      });
      rerender({ gameId: 43 });
      await act(async () => {
        void result.current.handleExitGame();
        await Promise.resolve();
      });
      await act(async () => {
        abort42.reject(new Error("offline"));
        await stale;
      });

      expect(result.current.isExitPending).toBe(true);
      await act(async () => {
        await result.current.handleExitGame();
      });
      expect(abortGame).toHaveBeenCalledTimes(2);
      expect(abortGame).toHaveBeenLastCalledWith(43);
    });
  });

  describe("when the page leaves the game before an exit call resolves", () => {
    const abortOk = { success: true, message: "ok" };
    const rematchOk = {
      success: true,
      gameId: 43,
      invitationLink: "https://example.test/join/abc",
    };

    it("should send no rematch, store reset or navigation when abort resolves after the game id changed", async () => {
      const abort = deferred<typeof abortOk>();
      vi.mocked(abortGame).mockReturnValueOnce(abort.promise);
      const { navigate, rerender, result, setPageError } = renderExitFlow();

      const { pending: stale } = await startExit(result.current.handleExitGame);
      rerender({ gameId: 43 });
      await act(async () => {
        abort.resolve(abortOk);
        await stale;
      });

      expect(resetRoomStore).not.toHaveBeenCalled();
      expect(createRematch).not.toHaveBeenCalled();
      expect(setInvitation).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(setPageError).not.toHaveBeenCalledWith(expect.any(String));
    });

    it("should send no rematch, store reset or navigation when abort resolves after unmount", async () => {
      const abort = deferred<typeof abortOk>();
      vi.mocked(abortGame).mockReturnValueOnce(abort.promise);
      const { navigate, result, setPageError, unmount } = renderExitFlow();

      const { pending: stale } = await startExit(result.current.handleExitGame);
      unmount();
      await act(async () => {
        abort.resolve(abortOk);
        await stale;
      });

      expect(resetRoomStore).not.toHaveBeenCalled();
      expect(createRematch).not.toHaveBeenCalled();
      expect(setInvitation).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(setPageError).not.toHaveBeenCalledWith(expect.any(String));
    });

    it("should set no invitation and not navigate when the page leaves while the rematch is created", async () => {
      const rematch = deferred<typeof rematchOk>();
      vi.mocked(abortGame).mockResolvedValueOnce(abortOk);
      vi.mocked(createRematch).mockReturnValueOnce(rematch.promise);
      const { navigate, rerender, result, setPageError } = renderExitFlow();

      const { pending: stale } = await startExit(result.current.handleExitGame);
      expect(createRematch).toHaveBeenCalledWith(42);
      rerender({ gameId: 43 });
      await act(async () => {
        rematch.resolve(rematchOk);
        await stale;
      });

      expect(setInvitation).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(setPageError).not.toHaveBeenCalledWith(expect.any(String));
    });

    it("should allow a new exit for a game the page returns to after its rematch resolved late", async () => {
      const rematch = deferred<typeof rematchOk>();
      vi.mocked(abortGame).mockResolvedValueOnce(abortOk);
      vi.mocked(createRematch).mockReturnValueOnce(rematch.promise);
      const { rerender, result } = renderExitFlow();

      const { pending: stale } = await startExit(result.current.handleExitGame);
      rerender({ gameId: 43 });
      rerender({ gameId: 42 });
      await act(async () => {
        rematch.resolve(rematchOk);
        await stale;
      });

      expect(result.current.isExitPending).toBe(false);
      vi.mocked(abortGame).mockReturnValueOnce(new Promise(() => {}));
      await startExit(result.current.handleExitGame);
      expect(abortGame).toHaveBeenCalledTimes(2);
      expect(abortGame).toHaveBeenLastCalledWith(42);
    });

    it("should allow a new exit for a game the page returns to after its exit succeeded late", async () => {
      const abort = deferred<typeof abortOk>();
      vi.mocked(abortGame).mockReturnValueOnce(abort.promise);
      vi.mocked(createRematch).mockResolvedValueOnce(rematchOk);
      const { rerender, result } = renderExitFlow();

      const { pending: stale } = await startExit(result.current.handleExitGame);
      rerender({ gameId: 43 });
      rerender({ gameId: 42 });
      await act(async () => {
        abort.resolve(abortOk);
        await stale;
      });

      expect(result.current.isExitPending).toBe(false);
      vi.mocked(abortGame).mockReturnValueOnce(new Promise(() => {}));
      await startExit(result.current.handleExitGame);
      expect(abortGame).toHaveBeenCalledTimes(2);
      expect(abortGame).toHaveBeenLastCalledWith(42);
    });
  });

  describe("when the page moves on during the status read", () => {
    function deferGameRead() {
      let resolveRead: (game: GameThrowsResponse) => void = () => {};
      vi.mocked(getGameThrows).mockImplementationOnce(
        () =>
          new Promise<GameThrowsResponse>((resolve) => {
            resolveRead = resolve;
          }),
      );
      return (game: GameThrowsResponse) => resolveRead(game);
    }

    it("should not navigate or report an error when the page unmounts before the read resolves", async () => {
      vi.mocked(abortGame).mockRejectedValueOnce(abortNotAllowed());
      const resolveRead = deferGameRead();
      const navigate = vi.fn();
      const setPageError = vi.fn();
      const { result, unmount } = renderHook(() =>
        useGameExitFlow({ gameId: 42, navigate, setPageError }),
      );

      const { pending } = await startExit(result.current.handleExitGame);
      const signal = vi.mocked(getGameThrows).mock.calls[0]?.[1];
      unmount();
      await act(async () => {
        resolveRead({ ...createGameData(), status: "finished", winnerId: 7 });
        await pending;
      });

      expect(signal?.aborted).toBe(true);
      expect(navigate).not.toHaveBeenCalled();
      expect(setPageError).not.toHaveBeenCalledWith(expect.any(String));
      expect(clientLoggerErrorMock).not.toHaveBeenCalled();
    });

    it("should not navigate or report an error when the game id changes before the read resolves", async () => {
      vi.mocked(abortGame).mockRejectedValueOnce(abortNotAllowed());
      const resolveRead = deferGameRead();
      const navigate = vi.fn();
      const setPageError = vi.fn();
      const { result, rerender } = renderHook(
        ({ gameId }) => useGameExitFlow({ gameId, navigate, setPageError }),
        { initialProps: { gameId: 42 } },
      );

      const { pending } = await startExit(result.current.handleExitGame);
      const signal = vi.mocked(getGameThrows).mock.calls[0]?.[1];
      rerender({ gameId: 43 });
      await act(async () => {
        resolveRead({ ...createGameData(), status: "finished", winnerId: 7 });
        await pending;
      });

      expect(signal?.aborted).toBe(true);
      expect(navigate).not.toHaveBeenCalled();
      expect(setPageError).not.toHaveBeenCalledWith(expect.any(String));
      expect(clientLoggerErrorMock).not.toHaveBeenCalled();
    });
  });
});
