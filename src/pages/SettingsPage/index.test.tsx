// @vitest-environment jsdom
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetGameStore, resetRoomStore, setCurrentGameId } from "@/store";
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

function renderSettingsPage(initialEntry: string): void {
  render(
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
});
