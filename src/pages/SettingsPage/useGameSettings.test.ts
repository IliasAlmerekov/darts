// @vitest-environment jsdom

vi.mock("react-router-dom", () => ({
  useParams: () => routeParams,
}));

vi.mock("@/shared/api/game", () => ({
  getGameSettings: (...args: unknown[]) => getGameSettingsMock(...args),
  saveGameSettings: (...args: unknown[]) => saveGameSettingsMock(...args),
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameQueries } from "@/shared/query/game.queries";
import { createQueryClient } from "@/shared/query/queryClient";
import {
  $gameData,
  $preCreateGameSettings,
  resetGameStore,
  setGameData,
  setGameSettings,
  setPreCreateGameSettings,
} from "@/shared/store";
import type { GameSettingsResponse, GameThrowsResponse } from "@/types";
import { useGameSettings } from "./useGameSettings";

const getGameSettingsMock = vi.fn();
const saveGameSettingsMock = vi.fn();
let routeParams: { id?: string } = { id: "1" };
let testQueryClient: QueryClient;

function settingsResponse(overrides: Partial<GameSettingsResponse> = {}): GameSettingsResponse {
  return {
    gameId: 1,
    status: "lobby",
    startScore: 301,
    doubleOut: false,
    tripleOut: false,
    ...overrides,
  };
}

function gameResponse(id: number, settings: GameThrowsResponse["settings"]): GameThrowsResponse {
  return {
    type: "full-state",
    id,
    status: "lobby",
    currentRound: 1,
    activePlayerId: 1,
    currentThrowCount: 0,
    winnerId: null,
    players: [],
    settings,
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return createElement(QueryClientProvider, { client: testQueryClient }, children);
}

async function renderLoadedHook(): Promise<
  ReturnType<typeof renderHook<ReturnType<typeof useGameSettings>, unknown>>
> {
  const hook = renderHook(() => useGameSettings(), { wrapper });
  await waitFor(() => {
    expect(hook.result.current.selectedPoints).not.toBeNull();
  });
  return hook;
}

describe("useGameSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testQueryClient = createQueryClient();
    routeParams = { id: "1" };
    resetGameStore();
    setPreCreateGameSettings({ startScore: 301, doubleOut: false, tripleOut: false });
    getGameSettingsMock.mockResolvedValue(settingsResponse({ startScore: 401, tripleOut: true }));
  });

  it("returns the route game's saved settings and no selection while they load", async () => {
    const hook = renderHook(() => useGameSettings(), { wrapper });

    expect(hook.result.current).toMatchObject({
      selectedGameMode: null,
      selectedPoints: null,
      isDisabled: true,
    });
    await waitFor(() => {
      expect(hook.result.current).toMatchObject({
        selectedGameMode: "triple-out",
        selectedPoints: 401,
        isDisabled: false,
        loadErrorMessage: null,
        saveErrorMessage: null,
      });
    });
  });

  it("returns the load error while the route game has no settings to show", async () => {
    getGameSettingsMock.mockRejectedValueOnce(new Error("Network down"));
    const hook = renderHook(() => useGameSettings(), { wrapper });

    await waitFor(() => {
      expect(hook.result.current.loadErrorMessage).not.toBeNull();
    });
    expect(hook.result.current.isDisabled).toBe(true);

    act(() => {
      hook.result.current.retryLoad();
    });

    await waitFor(() => {
      expect(hook.result.current.selectedPoints).toBe(401);
    });
    expect(hook.result.current.loadErrorMessage).toBeNull();
  });

  it("reads and writes the pre-create draft when the route has no game id", () => {
    routeParams = {};
    setPreCreateGameSettings({ startScore: 501, doubleOut: true, tripleOut: false });
    const hook = renderHook(() => useGameSettings(), { wrapper });

    expect(hook.result.current).toMatchObject({
      selectedGameMode: "double-out",
      selectedPoints: 501,
      isDisabled: false,
    });

    act(() => {
      hook.result.current.selectGameMode("triple-out");
    });
    act(() => {
      hook.result.current.selectPoints(101);
    });

    expect($preCreateGameSettings.get()).toEqual({
      startScore: 101,
      doubleOut: false,
      tripleOut: true,
    });
    expect(hook.result.current).toMatchObject({
      selectedGameMode: "triple-out",
      selectedPoints: 101,
    });
    expect(saveGameSettingsMock).not.toHaveBeenCalled();

    act(() => {
      hook.result.current.retryLoad();
    });
    expect(getGameSettingsMock).not.toHaveBeenCalled();
  });

  it("shows the change in the cache at once and keeps the save response once it resolves", async () => {
    const pendingSave = deferred<GameSettingsResponse>();
    saveGameSettingsMock.mockImplementationOnce(() => pendingSave.promise);
    const hook = await renderLoadedHook();

    act(() => {
      hook.result.current.selectPoints(501);
    });

    expect(saveGameSettingsMock).toHaveBeenCalledWith(
      { startScore: 501, doubleOut: false, tripleOut: true },
      1,
    );
    expect(hook.result.current).toMatchObject({ selectedPoints: 501, isDisabled: true });
    expect(testQueryClient.getQueryData(gameQueries.settings(1).queryKey)).toMatchObject({
      startScore: 501,
    });

    const saved = settingsResponse({ startScore: 501, doubleOut: true });
    await act(async () => {
      pendingSave.resolve(saved);
      await pendingSave.promise;
    });

    expect(testQueryClient.getQueryData(gameQueries.settings(1).queryKey)).toEqual(saved);
    expect(hook.result.current).toMatchObject({
      selectedGameMode: "double-out",
      selectedPoints: 501,
      isDisabled: false,
    });
  });

  it("rolls the cache back and returns the save error when the save fails", async () => {
    const pendingSave = deferred<GameSettingsResponse>();
    saveGameSettingsMock.mockImplementationOnce(() => pendingSave.promise);
    const hook = await renderLoadedHook();

    act(() => {
      hook.result.current.selectGameMode("double-out");
    });
    expect(saveGameSettingsMock).toHaveBeenCalledWith({ doubleOut: true, tripleOut: false }, 1);
    expect(hook.result.current.selectedGameMode).toBe("double-out");

    await act(async () => {
      pendingSave.reject(new Error("Network down"));
      await pendingSave.promise.catch(() => undefined);
    });

    expect(hook.result.current).toMatchObject({
      selectedGameMode: "triple-out",
      isDisabled: false,
      saveErrorMessage: "Could not update the game mode. Please try again.",
    });
    expect(testQueryClient.getQueryData(gameQueries.settings(1).queryKey)).toEqual(
      settingsResponse({ startScore: 401, tripleOut: true }),
    );
  });

  it("locks each game on its own pending save only", async () => {
    const pendingSave = deferred<GameSettingsResponse>();
    saveGameSettingsMock.mockImplementationOnce(() => pendingSave.promise);
    const hook = await renderLoadedHook();

    act(() => {
      hook.result.current.selectPoints(501);
    });
    act(() => {
      hook.result.current.selectGameMode("double-out");
    });
    expect(saveGameSettingsMock).toHaveBeenCalledTimes(1);

    routeParams = { id: "2" };
    getGameSettingsMock.mockResolvedValue(settingsResponse({ gameId: 2, startScore: 101 }));
    hook.rerender();
    await waitFor(() => {
      expect(hook.result.current.selectedPoints).toBe(101);
    });
    expect(hook.result.current.isDisabled).toBe(false);

    act(() => {
      hook.result.current.selectGameMode("double-out");
    });
    expect(saveGameSettingsMock).toHaveBeenLastCalledWith({ doubleOut: true, tripleOut: false }, 2);

    routeParams = { id: "1" };
    hook.rerender();
    expect(hook.result.current.isDisabled).toBe(true);
  });

  it("keeps a later save's response when an earlier save from an unmounted page fails", async () => {
    const firstSave = deferred<GameSettingsResponse>();
    const secondSave = deferred<GameSettingsResponse>();
    saveGameSettingsMock
      .mockImplementationOnce(() => firstSave.promise)
      .mockImplementationOnce(() => secondSave.promise);
    const firstPage = await renderLoadedHook();

    act(() => {
      firstPage.result.current.selectPoints(501);
    });
    firstPage.unmount();
    const secondPage = await renderLoadedHook();
    act(() => {
      secondPage.result.current.selectGameMode("double-out");
    });

    const saved = settingsResponse({ startScore: 501, doubleOut: true });
    await act(async () => {
      secondSave.resolve(saved);
      await secondSave.promise;
    });
    await act(async () => {
      firstSave.reject(new Error("Network down"));
      await firstSave.promise.catch(() => undefined);
    });

    expect(testQueryClient.getQueryData(gameQueries.settings(1).queryKey)).toEqual(saved);
    expect(secondPage.result.current).toMatchObject({
      selectedGameMode: "double-out",
      selectedPoints: 501,
    });
  });

  it("reads the game store's settings when the settings cache holds another game", () => {
    setGameData(gameResponse(2, { startScore: 501, doubleOut: true, tripleOut: false }));
    setGameSettings({ startScore: 101, doubleOut: false, tripleOut: false }, 1);
    routeParams = { id: "2" };

    const hook = renderHook(() => useGameSettings(), { wrapper });

    expect(hook.result.current).toMatchObject({
      selectedGameMode: "double-out",
      selectedPoints: 501,
      isDisabled: false,
    });
    expect(getGameSettingsMock).not.toHaveBeenCalled();
    expect($gameData.get()?.id).toBe(2);
  });
});
