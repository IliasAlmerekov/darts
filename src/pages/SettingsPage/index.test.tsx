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
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api";
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
    startScore: 301,
    doubleOut: false,
    tripleOut: false,
    ...overrides,
  };
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
}

function renderSettingsPage(initialEntry: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/:id" element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
