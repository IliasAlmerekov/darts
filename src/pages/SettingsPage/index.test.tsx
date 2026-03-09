// @vitest-environment jsdom
import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  $currentGameId,
  $gameData,
  resetGameStore,
  resetRoomStore,
  setCurrentGameId,
  setGameData,
} from "@/store";
import type { GameThrowsResponse } from "@/types";
import SettingsPage from ".";

const getGameThrowsMock = vi.fn();
const saveGameSettingsMock = vi.fn();

vi.mock("@/shared/api/game", () => ({
  getGameThrows: (...args: unknown[]) => getGameThrowsMock(...args),
  saveGameSettings: (...args: unknown[]) => saveGameSettingsMock(...args),
}));

vi.mock("@/shared/ui/admin-layout", () => ({
  AdminLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function createGameResponse(): GameThrowsResponse {
  return {
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

    getGameThrowsMock.mockResolvedValue(createGameResponse());
    saveGameSettingsMock.mockImplementation(() => new Promise(() => {}));
  });

  it("does not save settings from /settings when there is no active gameId", () => {
    renderSettingsPage("/settings");

    fireEvent.click(screen.getByRole("button", { name: "Double-out" }));

    expect(saveGameSettingsMock).not.toHaveBeenCalled();
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });

  it("ignores currentGameId from store on /settings without a route param", () => {
    setCurrentGameId(42);

    renderSettingsPage("/settings");

    fireEvent.click(screen.getByRole("button", { name: "Double-out" }));

    expect(saveGameSettingsMock).not.toHaveBeenCalled();
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });

  it("treats the route gameId as authoritative and ignores stale shared game settings", async () => {
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
    getGameThrowsMock.mockResolvedValueOnce({
      ...createGameResponse(),
      id: 42,
      settings: {
        startScore: 401,
        doubleOut: false,
        tripleOut: true,
      },
    });

    renderSettingsPage("/settings/42");

    expect(screen.getByRole("button", { name: "Single-out" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "501" }).getAttribute("aria-pressed")).toBe("false");

    await waitFor(() => {
      expect(getGameThrowsMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
      expect($currentGameId.get()).toBe(42);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
      expect(screen.getByRole("button", { name: "401" }).getAttribute("aria-pressed")).toBe("true");
    });
  });

  it("saves settings for the route gameId even when another page left a different game in the store", async () => {
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
    getGameThrowsMock.mockResolvedValueOnce({
      ...createGameResponse(),
      id: 42,
      settings: {
        startScore: 401,
        doubleOut: false,
        tripleOut: true,
      },
    });
    saveGameSettingsMock.mockResolvedValueOnce({
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
      expect(screen.getByRole("button", { name: "Triple-out" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Double-out" }));

    await waitFor(() => {
      expect(saveGameSettingsMock).toHaveBeenCalledWith(
        {
          startScore: 401,
          doubleOut: true,
          tripleOut: false,
        },
        42,
      );
    });
  });

  it("aborts an in-flight route settings load on unmount so it cannot overwrite shared game state later", async () => {
    const pendingLoad = createDeferred<GameThrowsResponse>();
    getGameThrowsMock.mockImplementation(() => pendingLoad.promise);

    const { unmount } = renderSettingsPage("/settings/42");

    await waitFor(() => {
      expect(getGameThrowsMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    });

    const loadSignal = getGameThrowsMock.mock.calls[0]?.[1] as AbortSignal | undefined;

    expect(loadSignal?.aborted).toBe(false);

    unmount();

    expect(loadSignal?.aborted).toBe(true);

    await act(async () => {
      pendingLoad.resolve(createGameResponse());
      await pendingLoad.promise;
    });

    expect($gameData.get()).toBeNull();
  });
});
