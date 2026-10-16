// @vitest-environment node
import { describe, expect, it } from "vitest";
import { gameIdOf, toWaitingRoomView } from "./waitingRoomView";

describe("toWaitingRoomView", () => {
  it("is loading until the first answer arrives", () => {
    expect(toWaitingRoomView(undefined, false)).toEqual({ kind: "loading" });
  });

  it("waits while the game is in the lobby", () => {
    expect(toWaitingRoomView({ gameId: 12, status: "lobby" }, false)).toEqual({
      kind: "waiting",
      gameId: 12,
    });
  });

  it("reports the start of the game", () => {
    expect(toWaitingRoomView({ gameId: 12, status: "started" }, true)).toEqual({
      kind: "started",
      gameId: 12,
    });
  });

  it("reports a removed player once a seen game is gone", () => {
    expect(toWaitingRoomView({ gameId: null, status: null }, true)).toEqual({
      kind: "removed",
    });
  });

  it("reports no game when the player never had one in this visit", () => {
    expect(toWaitingRoomView({ gameId: null, status: null }, false)).toEqual({
      kind: "no-game",
    });
  });
});

describe("gameIdOf", () => {
  it("names the game while the player waits or plays", () => {
    expect(gameIdOf({ kind: "waiting", gameId: 12 })).toBe(12);
    expect(gameIdOf({ kind: "started", gameId: 12 })).toBe(12);
  });

  it("names no game before the first answer or after the game is gone", () => {
    expect(gameIdOf({ kind: "loading" })).toBeNull();
    expect(gameIdOf({ kind: "removed" })).toBeNull();
  });
});
