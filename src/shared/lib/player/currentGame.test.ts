// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toCurrentGame } from "./currentGame";

describe("toCurrentGame", () => {
  it("reads a game in the lobby", () => {
    expect(toCurrentGame({ gameId: 12, status: "lobby" })).toEqual({ kind: "lobby", gameId: 12 });
  });

  it("reads a started game", () => {
    expect(toCurrentGame({ gameId: 12, status: "started" })).toEqual({
      kind: "started",
      gameId: 12,
    });
  });

  it("reads no game when both fields are null", () => {
    expect(toCurrentGame({ gameId: null, status: null })).toEqual({ kind: "none" });
  });

  it("reads no game when only the game id is null", () => {
    expect(toCurrentGame({ gameId: null, status: "lobby" })).toEqual({ kind: "none" });
  });

  it("keeps waiting in the lobby when a game has no status", () => {
    expect(toCurrentGame({ gameId: 12, status: null })).toEqual({ kind: "lobby", gameId: 12 });
  });
});
