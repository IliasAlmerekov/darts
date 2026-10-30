// @vitest-environment node
import { describe, expect, it } from "vitest";
import { RECENT_GAMES_LIMIT, type PlayerProfile } from "@/lib/player/profile";
import { gameIdOf, provesRemoval } from "./waitingRoomView";

describe("gameIdOf", () => {
  it("names the game while the player waits or plays", () => {
    expect(gameIdOf({ kind: "lobby", gameId: 12 })).toBe(12);
    expect(gameIdOf({ kind: "started", gameId: 12 })).toBe(12);
  });

  it("names no game before the first answer or after the game is gone", () => {
    expect(gameIdOf({ kind: "loading" })).toBeNull();
    expect(gameIdOf({ kind: "removed" })).toBeNull();
    expect(gameIdOf({ kind: "no-game" })).toBeNull();
  });
});

function finishedGames(...gameIds: number[]): PlayerProfile["history"] {
  return gameIds.map((gameId) => ({ gameId, summary: "", average: "", participants: [] }));
}

describe("provesRemoval", () => {
  it("proves a removal when the lobby game is missing from a short list", () => {
    expect(provesRemoval(finishedGames(), 42)).toBe(true);
    expect(provesRemoval(finishedGames(41, 40), 42)).toBe(true);
    const oneShortOfFull = Array.from({ length: RECENT_GAMES_LIMIT - 1 }, (_, index) => 50 + index);
    expect(provesRemoval(finishedGames(...oneShortOfFull), 42)).toBe(true);
  });

  it("proves no removal when the lobby game has finished", () => {
    expect(provesRemoval(finishedGames(41, 42), 42)).toBe(false);
  });

  it("proves nothing from a full list, which may have left the lobby game out", () => {
    const fullList = Array.from({ length: RECENT_GAMES_LIMIT }, (_, index) => 50 + index);

    expect(provesRemoval(finishedGames(...fullList), 42)).toBe(false);
  });
});
