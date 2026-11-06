// @vitest-environment jsdom
vi.mock("@/shared/api/room", () => ({
  createRoom: vi.fn(),
}));

vi.mock("@/shared/api/game", () => ({
  getGameSettings: vi.fn(),
  startGame: vi.fn(),
}));

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getGameSettings, startGame } from "@/shared/api/game";
import { createRoom } from "@/shared/api/room";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { setSoundEnabled } from "@/shared/services/browser/soundPlayer";
import {
  $currentGameId,
  $invitation,
  resetGameStore,
  resetPreCreateGameSettings,
  resetRoomStore,
  setPreCreateGameSettings,
} from "@/shared/store";
import { buildGameSettingsResponse } from "@/shared/types/game.test-support";
import { useCreateStartFlow } from "./useCreateStartFlow";

const navigate = vi.fn();
const setPageError = vi.fn();

function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderFlow({
  gameId = null,
  invitationGameId,
}: { gameId?: number | null; invitationGameId?: number } = {}) {
  return renderHook(
    () =>
      useCreateStartFlow({
        gameId,
        ...(invitationGameId !== undefined ? { invitationGameId } : {}),
        navigate,
        setPageError,
      }),
    { wrapper: Providers },
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useCreateStartFlow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
    queryClient.clear();
    resetRoomStore();
    resetGameStore();
    resetPreCreateGameSettings();
    setSoundEnabled(false);
  });

  describe("create", () => {
    it("creates a room with the draft settings and opens its start route", async () => {
      setPreCreateGameSettings({ startScore: 301, doubleOut: true, tripleOut: false });
      queryClient.setQueryData(gameQueries.tablet().queryKey, {
        game: null,
        lastFinishedGameId: 54,
      });
      vi.mocked(createRoom).mockResolvedValueOnce({ gameId: 55, invitationLink: "/invite/55" });
      const { result } = renderFlow();

      await act(async () => {
        await result.current.handleCreateRoom();
      });

      expect(createRoom).toHaveBeenCalledWith({
        startScore: 301,
        doubleOut: true,
        tripleOut: false,
      });
      expect(queryClient.getQueryData(gameQueries.settings(55).queryKey)).toMatchObject({
        startScore: 301,
        doubleOut: true,
        tripleOut: false,
      });
      expect($invitation.get()).toEqual({ gameId: 55, invitationLink: "/invite/55" });
      expect($currentGameId.get()).toBe(55);
      expect(queryClient.getQueryState(gameQueries.tablet().queryKey)?.isInvalidated).toBe(true);
      expect(navigate).toHaveBeenCalledWith("/start/55");
      expect(setPageError).toHaveBeenCalledWith(null);
      expect(result.current.creating).toBe(false);
    });

    it("shows a page error when the room cannot be created", async () => {
      vi.mocked(createRoom).mockRejectedValueOnce(new Error("network"));
      const { result } = renderFlow();

      await act(async () => {
        await result.current.handleCreateRoom();
      });

      expect(setPageError).toHaveBeenLastCalledWith(
        "Could not create a new game. Please try again.",
      );
      expect(navigate).not.toHaveBeenCalled();
      expect($invitation.get()).toBeNull();
      expect(result.current.creating).toBe(false);
    });

    it("does not create a room while an invitation exists", async () => {
      const { result } = renderFlow({ invitationGameId: 10 });

      await act(async () => {
        await result.current.handleCreateRoom();
      });

      expect(createRoom).not.toHaveBeenCalled();
      expect(setPageError).not.toHaveBeenCalled();
    });

    it("does not create a second room while the first request is in flight", async () => {
      const pending = deferred<{ gameId: number; invitationLink: string }>();
      vi.mocked(createRoom).mockReturnValueOnce(pending.promise);
      const { result } = renderFlow();

      let first = Promise.resolve();
      await act(async () => {
        first = result.current.handleCreateRoom();
        void result.current.handleCreateRoom();
      });
      expect(result.current.creating).toBe(true);
      await act(async () => {
        void result.current.handleCreateRoom();
      });

      expect(createRoom).toHaveBeenCalledTimes(1);
      await act(async () => {
        pending.resolve({ gameId: 55, invitationLink: "/invite/55" });
        await first;
      });
      expect(result.current.creating).toBe(false);
    });
  });

  describe("start", () => {
    it("starts the game with the room settings and opens the game route", async () => {
      vi.mocked(getGameSettings).mockResolvedValueOnce(
        buildGameSettingsResponse({ startScore: 101, doubleOut: true }),
      );
      vi.mocked(startGame).mockResolvedValueOnce(undefined);
      const { result } = renderFlow({ gameId: 10 });

      await act(async () => {
        await result.current.handleStartGame();
      });

      expect(getGameSettings).toHaveBeenCalledWith(10);
      expect(startGame).toHaveBeenCalledWith(10, {
        startScore: 101,
        doubleOut: true,
        tripleOut: false,
        round: 1,
        status: "started",
      });
      expect(navigate).toHaveBeenCalledWith("/game/10");
      expect(setPageError).toHaveBeenCalledWith(null);
      expect(result.current.starting).toBe(false);
    });

    it("shows a page error when the game cannot be started", async () => {
      vi.mocked(getGameSettings).mockResolvedValueOnce(buildGameSettingsResponse());
      vi.mocked(startGame).mockRejectedValueOnce(new Error("network"));
      const { result } = renderFlow({ gameId: 10 });

      await act(async () => {
        await result.current.handleStartGame();
      });

      expect(setPageError).toHaveBeenLastCalledWith("Could not start game. Please try again.");
      expect(navigate).not.toHaveBeenCalled();
      expect(result.current.starting).toBe(false);
    });

    it("does not start without a game", async () => {
      const { result } = renderFlow({ gameId: null });

      await act(async () => {
        await result.current.handleStartGame();
      });

      expect(getGameSettings).not.toHaveBeenCalled();
      expect(startGame).not.toHaveBeenCalled();
      expect(setPageError).not.toHaveBeenCalled();
    });

    it("does not start a second time while the first request is in flight", async () => {
      const pending = deferred<void>();
      vi.mocked(getGameSettings).mockResolvedValue(buildGameSettingsResponse());
      vi.mocked(startGame).mockReturnValueOnce(pending.promise);
      const { result } = renderFlow({ gameId: 10 });

      let first = Promise.resolve();
      await act(async () => {
        first = result.current.handleStartGame();
        void result.current.handleStartGame();
      });
      expect(result.current.starting).toBe(true);
      await act(async () => {
        void result.current.handleStartGame();
      });

      expect(getGameSettings).toHaveBeenCalledTimes(1);
      expect(startGame).toHaveBeenCalledTimes(1);
      await act(async () => {
        pending.resolve();
        await first;
      });
      expect(navigate).toHaveBeenCalledWith("/game/10");
    });
  });
});
