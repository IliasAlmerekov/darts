// @vitest-environment jsdom

// ── API mock (only external boundary) ────────────────────────────────────────
vi.mock("@/shared/api/game", () => ({
  createRematchGame: vi.fn(),
  getFinishedGame: vi.fn(),
  getGameSettings: vi.fn(),
  getTabletGame: vi.fn(),
  startRematch: vi.fn(),
  undoLastThrow: vi.fn(),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRematchGame,
  getFinishedGame,
  getGameSettings,
  getTabletGame,
  startRematch,
  undoLastThrow,
} from "@/shared/api/game";
import { queryClient } from "@/shared/query/queryClient";
import { resetGameStore, setGameData } from "@/shared/store";
import {
  buildFinishedPlayerResponses,
  buildGameSettingsResponse,
  buildGameThrowsResponse,
} from "@/shared/types/game.test-support";
import GameSummaryPage from ".";
import { gameSummaryLoader } from "./useGameSummaryPage";

const getFinishedGameMock = vi.mocked(getFinishedGame);
const getGameSettingsMock = vi.mocked(getGameSettings);
const getTabletGameMock = vi.mocked(getTabletGame);
const createRematchGameMock = vi.mocked(createRematchGame);
const startRematchMock = vi.mocked(startRematch);
const undoLastThrowMock = vi.mocked(undoLastThrow);

const SETTINGS = buildGameSettingsResponse({ gameId: 42, status: "finished", startScore: 301 });

function renderSummaryRoute(path = "/summary/42"): ReturnType<typeof render> {
  const router = createMemoryRouter(
    [
      {
        path: "/summary/:id",
        element: <GameSummaryPage />,
        loader: gameSummaryLoader,
        errorElement: <h1>Route error</h1>,
      },
      { path: "/details/:id", element: <h1>Game details</h1> },
    ],
    { initialEntries: [path] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("GameSummaryPage route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
    resetGameStore();
    getTabletGameMock.mockResolvedValue({ game: null, lastFinishedGameId: 42 });
  });

  it("should move an older game's summary to its details, without Undo and Rematch", async () => {
    getTabletGameMock.mockResolvedValue({ game: null, lastFinishedGameId: 56 });

    renderSummaryRoute("/summary/55");

    expect(await screen.findByRole("heading", { name: "Game details" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Play Again" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Return to game" })).toBeNull();
    expect(getFinishedGameMock).not.toHaveBeenCalled();
  });

  it("should show Undo and Rematch on the last finished game's summary", async () => {
    getFinishedGameMock.mockResolvedValue(buildFinishedPlayerResponses());
    getGameSettingsMock.mockResolvedValue(SETTINGS);

    renderSummaryRoute("/summary/42");

    expect(await screen.findByRole("button", { name: "Play Again" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Return to game" })).toBeTruthy();
  });

  it("should render the summary after a reload, when the game store is empty", async () => {
    getFinishedGameMock.mockResolvedValue(buildFinishedPlayerResponses());
    getGameSettingsMock.mockResolvedValue(SETTINGS);

    renderSummaryRoute();

    expect(await screen.findByRole("button", { name: "Play Again" })).toBeTruthy();
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    expect(screen.queryByText("Game settings are unavailable")).toBeNull();
    expect(getGameSettingsMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
  });

  it("should show the settings error with Retry when the settings fetch fails", async () => {
    getFinishedGameMock.mockResolvedValue(buildFinishedPlayerResponses());
    getGameSettingsMock.mockRejectedValue(new Error("network down"));

    renderSummaryRoute();

    expect(await screen.findByText("Game settings are unavailable")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Play Again" })).toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("should render the summary once Retry loads the settings", async () => {
    getFinishedGameMock.mockResolvedValue(buildFinishedPlayerResponses());
    getGameSettingsMock.mockRejectedValue(new Error("network down"));
    renderSummaryRoute();
    const retryButton = await screen.findByRole("button", { name: "Retry" });

    getGameSettingsMock.mockResolvedValue(SETTINGS);
    fireEvent.click(retryButton);

    expect(await screen.findByRole("button", { name: "Play Again" })).toBeTruthy();
    expect(screen.queryByText("Game settings are unavailable")).toBeNull();
  });

  it("should not request the settings when the game page already holds them", async () => {
    getFinishedGameMock.mockResolvedValue(buildFinishedPlayerResponses());
    setGameData(buildGameThrowsResponse({ id: 42, status: "finished" }));

    renderSummaryRoute();

    expect(await screen.findByRole("button", { name: "Play Again" })).toBeTruthy();
    expect(getGameSettingsMock).not.toHaveBeenCalled();
  });

  it("should show the loading skeleton while the settings fetch runs", async () => {
    getFinishedGameMock.mockResolvedValue(buildFinishedPlayerResponses());
    getGameSettingsMock.mockRejectedValueOnce(new Error("network down"));
    getGameSettingsMock.mockReturnValue(new Promise(() => {}));

    renderSummaryRoute();

    expect(await screen.findByRole("status", { name: "Loading page" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Play Again" })).toBeNull();
  });

  it("should show the settings error when the settings carry no valid start score", async () => {
    getFinishedGameMock.mockResolvedValue(buildFinishedPlayerResponses());
    getGameSettingsMock.mockResolvedValue({ ...SETTINGS, startScore: 0 });

    renderSummaryRoute();

    expect(
      await screen.findByText("Could not render summary because start score is missing."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Play Again" })).toBeNull();
  });

  it.each(["abc", "0", "-5", "1e3"])(
    "should hand /summary/%s to the route error element and send no request",
    async (id) => {
      renderSummaryRoute(`/summary/${id}`);

      expect(await screen.findByRole("heading", { name: "Route error" })).toBeTruthy();
      expect(getTabletGameMock).not.toHaveBeenCalled();
      expect(getFinishedGameMock).not.toHaveBeenCalled();
      expect(getGameSettingsMock).not.toHaveBeenCalled();
    },
  );

  // #100
  describe("while Undo is pending", () => {
    beforeEach(() => {
      getFinishedGameMock.mockResolvedValue(buildFinishedPlayerResponses());
      getGameSettingsMock.mockResolvedValue(SETTINGS);
      undoLastThrowMock.mockReturnValue(new Promise(() => {}));
    });

    async function clickUndo(): Promise<void> {
      renderSummaryRoute();
      fireEvent.click(await screen.findByRole("button", { name: "Return to game" }));
    }

    it("should send no second Undo", async () => {
      await clickUndo();

      fireEvent.click(screen.getByRole("button", { name: "Return to game" }));

      expect(undoLastThrowMock).toHaveBeenCalledTimes(1);
    });

    it("should not start a rematch from Play Again", async () => {
      await clickUndo();

      fireEvent.click(screen.getByRole("button", { name: "Play Again" }));

      expect(startRematchMock).not.toHaveBeenCalled();
    });

    it("should not create a rematch room from Back To Start", async () => {
      await clickUndo();

      fireEvent.click(screen.getByRole("button", { name: "Back To Start" }));

      expect(createRematchGameMock).not.toHaveBeenCalled();
    });
  });
});
