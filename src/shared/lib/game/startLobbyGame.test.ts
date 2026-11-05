// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { respondWith } from "@/shared/api/test-utils";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { $gameData, acceptGame } from "@/shared/store";
import {
  buildGameSettingsResponse,
  buildGameThrowsResponse,
} from "@/shared/types/game.test-support";
import { startLobbyGame } from "./startLobbyGame";

vi.mock("@/shared/api/client", async (original) => ({
  ...(await original<typeof import("@/shared/api/client")>()),
  apiClient: { post: vi.fn() },
}));
const game = buildGameThrowsResponse();
const settings = buildGameSettingsResponse();
describe("startLobbyGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    acceptGame(game);
    queryClient.setQueryData(gameQueries.tablet().queryKey, {
      game: null,
      lastFinishedGameId: null,
    });
  });
  it("clears the game and invalidates the tablet after the start", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith(game));
    await startLobbyGame(1, settings);
    expect($gameData.get()).toBeNull();
    expect(queryClient.getQueryState(gameQueries.tablet().queryKey)?.isInvalidated).toBe(true);
  });
  it("preserves the game and tablet when the start fails", async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("failed"));
    await expect(startLobbyGame(1, settings)).rejects.toThrow("failed");
    expect($gameData.get()).toEqual(game);
    expect(queryClient.getQueryState(gameQueries.tablet().queryKey)?.isInvalidated).toBe(false);
  });
  it("keeps a different game loaded while the start request is pending", async () => {
    let finish: (value: never) => void = () => {};
    vi.mocked(apiClient.post).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = startLobbyGame(1, settings);
    const newerGame = buildGameThrowsResponse({ id: 2 });
    acceptGame(newerGame);
    finish(game as never);
    await pending;
    expect($gameData.get()).toEqual(newerGame);
    expect(queryClient.getQueryState(gameQueries.tablet().queryKey)?.isInvalidated).toBe(true);
  });
});
