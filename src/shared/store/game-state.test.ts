// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { toRoster } from "@/lib/game/roster";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import { $gameData, acceptGame, acceptGameSettings, resetGameStore } from "./game-state";

describe("game store query bridge", () => {
  beforeEach(() => {
    queryClient.clear();
    resetGameStore();
  });

  it("mirrors lobby games and confirmed settings without changing another game", () => {
    const game = buildGameThrowsResponse({ status: "lobby", players: [buildBackendPlayer()] });
    acceptGame(game);
    expect($gameData.get()).toEqual(game);
    expect(queryClient.getQueryData(gameQueries.settings(game.id).queryKey)).toEqual(game.settings);
    expect(queryClient.getQueryData(gameQueries.roster(game.id).queryKey)).toEqual(
      toRoster(game.players),
    );

    const settings = { startScore: 301, doubleOut: true, tripleOut: false };
    acceptGameSettings(game.id, settings);
    expect($gameData.get()?.settings).toEqual(settings);
    expect(queryClient.getQueryData(gameQueries.settings(game.id).queryKey)).toEqual(settings);
    acceptGameSettings(2, game.settings);
    expect($gameData.get()?.settings).toEqual(settings);
    expect(queryClient.getQueryData(gameQueries.settings(2).queryKey)).toEqual(game.settings);
  });

  it("keeps accepted settings when an older read completes", async () => {
    let resolveRead: (settings: {
      startScore: number;
      doubleOut: boolean;
      tripleOut: boolean;
    }) => void = () => {};
    const read = new Promise<{ startScore: number; doubleOut: boolean; tripleOut: boolean }>(
      (resolve) => {
        resolveRead = resolve;
      },
    );
    const key = gameQueries.settings(1).queryKey;
    const pending = queryClient
      .fetchQuery({ queryKey: key, queryFn: () => read })
      .catch(() => undefined);
    const accepted = { startScore: 301, doubleOut: true, tripleOut: false };
    acceptGameSettings(1, accepted);
    resolveRead({ startScore: 501, doubleOut: false, tripleOut: false });
    await pending;

    expect(queryClient.getQueryData(key)).toEqual(accepted);
  });

  it("clears the game without removing cached settings", () => {
    const game = buildGameThrowsResponse();
    acceptGame(game);
    acceptGame(null);
    expect($gameData.get()).toBeNull();
    acceptGame(game);
    resetGameStore();
    expect($gameData.get()).toBeNull();
    expect(queryClient.getQueryData(gameQueries.settings(game.id).queryKey)).toEqual(game.settings);
  });
});
