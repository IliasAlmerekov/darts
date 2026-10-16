// @vitest-environment node
import { describe, expect, it } from "vitest";
import { gameIdOf } from "./waitingRoomView";

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
