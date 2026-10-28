// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clearClientSession } from "./clearClientSession";
import { queryClient } from "@/shared/query/queryClient";
import {
  $currentGameId,
  $invitation,
  GAME_ID_STORAGE_KEY,
  resetRoomStore,
  setCurrentGameId,
  setInvitation,
} from "@/shared/store/game-session";
import { $gameData, resetGameStore, setGameData } from "@/shared/store/game-state";
import { buildGameThrowsResponse } from "@/shared/types/game.test-support";

describe("clearClientSession", () => {
  beforeEach(() => {
    queryClient.clear();
    resetRoomStore();
    resetGameStore();
  });

  it("clears the query cache", () => {
    queryClient.setQueryData(["auth", "me"], { id: 1 });

    clearClientSession();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("clears the room store, the stored game id and the game store", () => {
    setCurrentGameId(7);
    setInvitation({ gameId: 7, invitationLink: "/invite/7" });
    setGameData(buildGameThrowsResponse());

    clearClientSession();

    expect($currentGameId.get()).toBeNull();
    expect($invitation.get()).toBeNull();
    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBeNull();
    expect($gameData.get()).toBeNull();
  });
});
