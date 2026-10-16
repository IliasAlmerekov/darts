// @vitest-environment jsdom

const getGameSettingsMock = vi.hoisted(() => vi.fn());
const saveGameSettingsMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api/game", () => ({
  getGameSettings: (...args: unknown[]) => getGameSettingsMock(...args),
  saveGameSettings: (...args: unknown[]) => saveGameSettingsMock(...args),
}));

vi.mock("@/shared/ui/admin-layout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api";
import { gameQueries } from "@/shared/query/game.queries";
import { createQueryClient } from "@/shared/query/queryClient";
import {
  $currentGameId,
  $gameData,
  $preCreateGameSettings,
  setPreCreateGameSettings,
  setGameSettings,
  resetGameStore,
  resetRoomStore,
  setCurrentGameId,
  setGameData,
} from "@/shared/store";
import type { GameSettingsResponse, GameThrowsResponse } from "@/types";
import SettingsPage from ".";

function createGameResponse(): GameThrowsResponse {
  return {
    type: "full-state",
    id: 42,
    status: "lobby",
    currentRound: 1,
    activePlayerId: 1,
    currentThrowCount: 0,
    winnerId: null,
    players: [],
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
  };
}

function createSettingsResponse(
  overrides: Partial<GameSettingsResponse> = {},
): GameSettingsResponse {
  return {
    gameId: 1,
    status: "lobby",
    startScore: 301,
    doubleOut: false,
    tripleOut: false,
    ...overrides,
  };
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => {};
  let rejectPromise: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

let testQueryClient: QueryClient;

const GAME_ONE_SETTINGS = createSettingsResponse({ gameId: 1, startScore: 301 });
const GAME_TWO_SETTINGS = createSettingsResponse({ gameId: 2, startScore: 401, doubleOut: true });

const SETTINGS_SAVE_CASES = [
  {
    setting: "Game Mode",
    gameOneClick: "Triple-out",
    gameOneResponse: createSettingsResponse({ gameId: 1, startScore: 301, tripleOut: true }),
    gameTwoSelected: "Double-out",
    gameTwoClick: "Single-out",
    gameTwoPayload: { doubleOut: false, tripleOut: false },
  },
  {
    setting: "Points",
    gameOneClick: "501",
    gameOneResponse: createSettingsResponse({ gameId: 1, startScore: 501 }),
    gameTwoSelected: "401",
    gameTwoClick: "101",
    gameTwoPayload: { startScore: 101, doubleOut: true, tripleOut: false },
  },
] as const;

function isPressed(name: string): boolean {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed") === "true";
}

// Game 1 is read from the server; game 2 is the game in the store and in the cache.
async function startSaveOnGameOneThenMoveToGameTwo(
  gameOneClick: string,
): Promise<Deferred<GameSettingsResponse>> {
  const pendingSave = createDeferred<GameSettingsResponse>();
  saveGameSettingsMock.mockImplementationOnce(() => pendingSave.promise);
  getGameSettingsMock.mockResolvedValue(GAME_ONE_SETTINGS);
  setGameData({ ...createGameResponse(), id: 2, settings: GAME_TWO_SETTINGS });
  testQueryClient.setQueryData(gameQueries.settings(2).queryKey, GAME_TWO_SETTINGS);
  const router = renderSettingsRouter("/settings/1");
  await waitFor(() => {
    expect(isPressed("301")).toBe(true);
  });

  fireEvent.click(screen.getByRole("button", { name: gameOneClick }));
  expect(saveGameSettingsMock).toHaveBeenCalledWith(expect.anything(), 1);
  await act(async () => {
    await router.navigate("/settings/2");
  });
  await waitFor(() => {
    expect(isPressed("401")).toBe(true);
  });
  return pendingSave;
}

function expectGameTwoUnchanged(gameTwoSelected: string): void {
  expect(isPressed(gameTwoSelected)).toBe(true);
  expect(testQueryClient.getQueryData(gameQueries.settings(2).queryKey)).toEqual(GAME_TWO_SETTINGS);
  expect($gameData.get()).toEqual(expect.objectContaining({ id: 2, settings: GAME_TWO_SETTINGS }));
  expect(screen.queryByRole("alert")).toBeNull();
}

function renderSettingsPage(initialEntry: string): ReturnType<typeof render> {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:id" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderSettingsRouter(initialEntry: string): ReturnType<typeof createMemoryRouter> {
  const router = createMemoryRouter([{ path: "/settings/:id", element: <SettingsPage /> }], {
    initialEntries: [initialEntry],
  });
  render(
    <QueryClientProvider client={testQueryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testQueryClient = createQueryClient();
    resetGameStore();
    resetRoomStore();
    setPreCreateGameSettings({
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    });

    getGameSettingsMock.mockResolvedValue(createSettingsResponse());
    saveGameSettingsMock.mockImplementation(() => new Promise(() => {}));
  });

  it("should hydrate from the active game in store without fetching settings again", async () => {
    setCurrentGameId(42);
    setGameData({
      ...createGameResponse(),
      id: 42,
      settings: {
        startScore: 401,
        doubleOut: true,
        tripleOut: false,
      },
    });

    renderSettingsPage("/settings/42");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Double-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
      expect(screen.getByRole("button", { name: "401" }).getAttribute("aria-pressed")).toBe("true");
    });

    expect(getGameSettingsMock).not.toHaveBeenCalled();
  });

  it("should fetch canonical settings on direct route access when the game is not in the store", async () => {
    getGameSettingsMock.mockResolvedValueOnce(
      createSettingsResponse({
        startScore: 501,
        doubleOut: false,
        tripleOut: true,
      }),
    );

    renderSettingsPage("/settings/42");

    await waitFor(() => {
      expect(getGameSettingsMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
      expect(screen.getByRole("button", { name: "501" }).getAttribute("aria-pressed")).toBe("true");
    });
  });

  it("should not preselect fallback defaults while route settings are loading", async () => {
    const pendingLoad = createDeferred<GameSettingsResponse>();
    getGameSettingsMock.mockImplementationOnce(() => pendingLoad.promise);

    renderSettingsPage("/settings/42");

    const singleOutButton = screen.getByRole("button", { name: "Single-out" });
    const pointsButton = screen.getByRole("button", { name: "301" });

    expect(singleOutButton.getAttribute("aria-pressed")).toBe("false");
    expect(pointsButton.getAttribute("aria-pressed")).toBe("false");
    expect(singleOutButton.getAttribute("disabled")).not.toBeNull();
    expect(pointsButton.getAttribute("disabled")).not.toBeNull();

    fireEvent.click(pointsButton);

    expect(saveGameSettingsMock).not.toHaveBeenCalled();

    pendingLoad.resolve(
      createSettingsResponse({
        startScore: 101,
        doubleOut: false,
        tripleOut: true,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
      expect(screen.getByRole("button", { name: "101" }).getAttribute("aria-pressed")).toBe("true");
    });
  });

  it("should show cached route settings immediately while canonical settings refresh in the background", async () => {
    setGameSettings(
      {
        startScore: 101,
        doubleOut: false,
        tripleOut: true,
      },
      42,
    );
    const pendingLoad = createDeferred<GameSettingsResponse>();
    getGameSettingsMock.mockImplementationOnce(() => pendingLoad.promise);

    renderSettingsPage("/settings/42");

    expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "101" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "101" }).getAttribute("disabled")).toBeNull();

    await waitFor(() => {
      expect(getGameSettingsMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    });

    pendingLoad.resolve(
      createSettingsResponse({
        startScore: 101,
        doubleOut: true,
        tripleOut: false,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Double-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });
  });

  it("should update the pre-create draft from /settings when there is no active gameId", async () => {
    renderSettingsPage("/settings");

    fireEvent.click(screen.getByRole("button", { name: "Double-out" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Double-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
      expect($preCreateGameSettings.get()).toEqual({
        startScore: 301,
        doubleOut: true,
        tripleOut: false,
      });
    });

    expect(saveGameSettingsMock).not.toHaveBeenCalled();
    expect(getGameSettingsMock).not.toHaveBeenCalled();
  });

  it("should use the standalone pre-create draft on /settings even when store has currentGameId", async () => {
    setCurrentGameId(42);
    setPreCreateGameSettings({
      startScore: 401,
      doubleOut: false,
      tripleOut: true,
    });

    renderSettingsPage("/settings");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
      expect(screen.getByRole("button", { name: "401" }).getAttribute("aria-pressed")).toBe("true");
    });

    expect(saveGameSettingsMock).not.toHaveBeenCalled();
    expect(getGameSettingsMock).not.toHaveBeenCalled();
  });

  it("should treat the route gameId as authoritative and ignore stale shared game settings", async () => {
    setCurrentGameId(99);
    setGameData({
      ...createGameResponse(),
      id: 99,
      settings: {
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      },
    });
    getGameSettingsMock.mockResolvedValueOnce(
      createSettingsResponse({
        startScore: 401,
        doubleOut: false,
        tripleOut: true,
      }),
    );

    renderSettingsPage("/settings/42");

    expect(screen.getByRole("button", { name: "Single-out" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(screen.getByRole("button", { name: "501" }).getAttribute("aria-pressed")).toBe("false");

    await waitFor(() => {
      expect(getGameSettingsMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
      expect($currentGameId.get()).toBe(42);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
      expect(screen.getByRole("button", { name: "401" }).getAttribute("aria-pressed")).toBe("true");
    });
  });

  it("should save settings for the route gameId even when another page left a different game in the store", async () => {
    setCurrentGameId(99);
    setGameData({
      ...createGameResponse(),
      id: 99,
      settings: {
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      },
    });
    getGameSettingsMock.mockResolvedValueOnce(
      createSettingsResponse({
        startScore: 401,
        doubleOut: false,
        tripleOut: true,
      }),
    );
    saveGameSettingsMock.mockResolvedValueOnce({
      startScore: 401,
      doubleOut: true,
      tripleOut: false,
    });

    renderSettingsPage("/settings/42");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Double-out" }));

    await waitFor(() => {
      expect(saveGameSettingsMock).toHaveBeenCalledWith(
        {
          doubleOut: true,
          tripleOut: false,
        },
        42,
      );
      expect($gameData.get()).toEqual(
        expect.objectContaining({
          id: 99,
          settings: {
            startScore: 501,
            doubleOut: true,
            tripleOut: false,
          },
        }),
      );
      expect(screen.getByRole("button", { name: "Double-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });
  });

  it("should not send startScore when changing only the game mode for an existing game", async () => {
    getGameSettingsMock.mockResolvedValueOnce(
      createSettingsResponse({
        startScore: 501,
        doubleOut: false,
        tripleOut: true,
      }),
    );
    saveGameSettingsMock.mockResolvedValueOnce({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });

    renderSettingsPage("/settings/42");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Double-out" }));

    await waitFor(() => {
      expect(saveGameSettingsMock).toHaveBeenCalledWith(
        {
          doubleOut: true,
          tripleOut: false,
        },
        42,
      );
    });
  });

  it("should send the selected points when changing points for an existing game", async () => {
    getGameSettingsMock.mockResolvedValueOnce(
      createSettingsResponse({
        startScore: 301,
        doubleOut: true,
        tripleOut: false,
      }),
    );
    saveGameSettingsMock.mockResolvedValueOnce({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });

    renderSettingsPage("/settings/42");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Double-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "501" }));

    await waitFor(() => {
      expect(saveGameSettingsMock).toHaveBeenCalledWith(
        {
          startScore: 501,
          doubleOut: true,
          tripleOut: false,
        },
        42,
      );
    });
  });

  it("should show an explicit inline error when the server forbids changing points for an existing game", async () => {
    getGameSettingsMock.mockResolvedValueOnce(
      createSettingsResponse({
        startScore: 301,
        doubleOut: true,
        tripleOut: false,
      }),
    );
    saveGameSettingsMock.mockRejectedValueOnce(
      new ApiError("Conflict", {
        status: 409,
        data: { error: "GAME_START_SCORE_CHANGE_NOT_ALLOWED" },
      }),
    );

    renderSettingsPage("/settings/42");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Double-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "501" }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("Could not update settings");
      expect(alert.textContent).toContain(
        "The start score cannot be changed for an existing game.",
      );
      expect(screen.getByRole("button", { name: "301" }).getAttribute("aria-pressed")).toBe("true");
    });
  });

  it("should abort an in-flight route settings load on unmount so it cannot overwrite shared game state later", async () => {
    const pendingLoad = createDeferred<GameSettingsResponse>();
    getGameSettingsMock.mockImplementation(() => pendingLoad.promise);

    const { unmount } = renderSettingsPage("/settings/42");

    await waitFor(() => {
      expect(getGameSettingsMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    });

    const loadSignal = getGameSettingsMock.mock.calls[0]?.[1] as AbortSignal | undefined;

    expect(loadSignal?.aborted).toBe(false);

    unmount();

    expect(loadSignal?.aborted).toBe(true);

    await act(async () => {
      pendingLoad.resolve(createSettingsResponse());
      await pendingLoad.promise;
    });

    expect($gameData.get()).toBeNull();
  });

  it("should show route game B's settings when game A's response arrives after B's", async () => {
    const gameA = createDeferred<GameSettingsResponse>();
    const gameB = createDeferred<GameSettingsResponse>();
    getGameSettingsMock.mockImplementation((gameId: number) =>
      gameId === 1 ? gameA.promise : gameB.promise,
    );
    const router = renderSettingsRouter("/settings/1");
    await waitFor(() => {
      expect(getGameSettingsMock).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    });

    await act(async () => {
      await router.navigate("/settings/2");
    });
    await act(async () => {
      gameB.resolve(createSettingsResponse({ startScore: 401, doubleOut: true }));
      await gameB.promise;
    });
    await act(async () => {
      gameA.resolve(createSettingsResponse({ startScore: 101, tripleOut: true }));
      await gameA.promise;
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Double-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });
    expect(screen.getByRole("button", { name: "401" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("should replace the cached settings of the route game with the save response", async () => {
    getGameSettingsMock.mockResolvedValueOnce(createSettingsResponse({ startScore: 301 }));
    saveGameSettingsMock.mockResolvedValueOnce(
      createSettingsResponse({ startScore: 501, tripleOut: true }),
    );

    renderSettingsPage("/settings/42");
    await waitFor(() => {
      expect(testQueryClient.getQueryData(gameQueries.settings(42).queryKey)).toEqual(
        createSettingsResponse({ startScore: 301 }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "501" }));

    await waitFor(() => {
      expect(testQueryClient.getQueryData(gameQueries.settings(42).queryKey)).toEqual(
        createSettingsResponse({ startScore: 501, tripleOut: true }),
      );
    });
    expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("should keep the save response when a settings read that started earlier resolves later", async () => {
    setGameSettings(createSettingsResponse({ startScore: 301 }), 42);
    const pendingLoad = createDeferred<GameSettingsResponse>();
    getGameSettingsMock.mockImplementationOnce(() => pendingLoad.promise);
    saveGameSettingsMock.mockResolvedValueOnce(createSettingsResponse({ startScore: 501 }));

    renderSettingsPage("/settings/42");
    await waitFor(() => {
      expect(getGameSettingsMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    });
    fireEvent.click(screen.getByRole("button", { name: "501" }));
    await waitFor(() => {
      expect(testQueryClient.getQueryData(gameQueries.settings(42).queryKey)).toEqual(
        createSettingsResponse({ startScore: 501 }),
      );
    });

    await act(async () => {
      pendingLoad.resolve(createSettingsResponse({ startScore: 301 }));
      await pendingLoad.promise;
    });

    expect(testQueryClient.getQueryData(gameQueries.settings(42).queryKey)).toEqual(
      createSettingsResponse({ startScore: 501 }),
    );
    expect(screen.getByRole("button", { name: "501" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("should keep a save for game A under game A when the route moves to game B before it resolves", async () => {
    const pendingSave = createDeferred<GameSettingsResponse>();
    saveGameSettingsMock.mockImplementationOnce(() => pendingSave.promise);
    getGameSettingsMock.mockImplementation((gameId: number) =>
      Promise.resolve(createSettingsResponse({ startScore: gameId === 1 ? 301 : 401 })),
    );
    const router = renderSettingsRouter("/settings/1");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "301" }).getAttribute("aria-pressed")).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "501" }));
    await act(async () => {
      await router.navigate("/settings/2");
    });
    await act(async () => {
      pendingSave.resolve(createSettingsResponse({ startScore: 501 }));
      await pendingSave.promise;
    });

    expect(testQueryClient.getQueryData(gameQueries.settings(1).queryKey)).toEqual(
      createSettingsResponse({ startScore: 501 }),
    );
    await waitFor(() => {
      expect(testQueryClient.getQueryData(gameQueries.settings(2).queryKey)).toEqual(
        createSettingsResponse({ startScore: 401 }),
      );
    });
    expect(screen.getByRole("button", { name: "401" }).getAttribute("aria-pressed")).toBe("true");
  });

  describe.each(SETTINGS_SAVE_CASES)(
    "when a $setting save for game 1 settles after the route moved to game 2",
    ({ gameOneClick, gameOneResponse, gameTwoSelected, gameTwoClick, gameTwoPayload }) => {
      it("should leave game 2's screen, cache and game store unchanged when the save fails", async () => {
        const pendingSave = await startSaveOnGameOneThenMoveToGameTwo(gameOneClick);

        await act(async () => {
          pendingSave.reject(new Error("Network down"));
          await pendingSave.promise.catch(() => undefined);
        });

        expectGameTwoUnchanged(gameTwoSelected);
        expect(testQueryClient.getQueryData(gameQueries.settings(1).queryKey)).toEqual(
          GAME_ONE_SETTINGS,
        );
      });

      it("should store the response under game 1 and leave game 2's screen and cache unchanged", async () => {
        const pendingSave = await startSaveOnGameOneThenMoveToGameTwo(gameOneClick);

        await act(async () => {
          pendingSave.resolve(gameOneResponse);
          await pendingSave.promise;
        });

        expect(testQueryClient.getQueryData(gameQueries.settings(1).queryKey)).toEqual(
          gameOneResponse,
        );
        expectGameTwoUnchanged(gameTwoSelected);
      });

      it("should let game 2 save right away while game 1's save is pending", async () => {
        await startSaveOnGameOneThenMoveToGameTwo(gameOneClick);
        const gameTwoButton = screen.getByRole("button", { name: gameTwoClick });

        expect(gameTwoButton.getAttribute("disabled")).toBeNull();
        fireEvent.click(gameTwoButton);

        expect(saveGameSettingsMock).toHaveBeenLastCalledWith(gameTwoPayload, 2);
        expect(isPressed(gameTwoClick)).toBe(true);
      });
    },
  );
});
