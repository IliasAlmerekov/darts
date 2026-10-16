// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toWaitingRoomStatus } from "./waitingRoomStatus";

describe("toWaitingRoomStatus", () => {
  it("is loading until the first answer arrives", () => {
    expect(toWaitingRoomStatus(undefined, false)).toEqual({ kind: "loading" });
  });

  it("waits while the game is in the lobby", () => {
    expect(toWaitingRoomStatus({ gameId: 12, status: "lobby" }, false)).toEqual({
      kind: "waiting",
      gameId: 12,
    });
  });

  it("reports the start of the game", () => {
    expect(toWaitingRoomStatus({ gameId: 12, status: "started" }, true)).toEqual({
      kind: "started",
      gameId: 12,
    });
  });

  it("reports a removed player once a seen game is gone", () => {
    expect(toWaitingRoomStatus({ gameId: null, status: null }, true)).toEqual({
      kind: "removed",
    });
  });

  it("reports no game when the player never had one in this visit", () => {
    expect(toWaitingRoomStatus({ gameId: null, status: null }, false)).toEqual({
      kind: "no-game",
    });
  });
});
