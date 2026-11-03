// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parsePlayersEvent } from "./playersEvent";

describe("parsePlayersEvent", () => {
  it("maps a valid player from the backend contract", () => {
    expect(
      parsePlayersEvent({
        players: [{ id: 1, name: "Alice", position: 2, placement: null, isGuest: false }],
        count: 1,
      }),
    ).toEqual([{ id: 1, name: "Alice", position: 2 }]);
  });

  it("prefers username over name and items over players", () => {
    expect(
      parsePlayersEvent({
        players: [{ id: 9, name: "Ignored" }],
        items: [{ id: 1, username: "Bob", name: "Robert", position: 0 }],
      }),
    ).toEqual([{ id: 1, name: "Bob", position: 0 }]);
  });

  it("falls back to an empty name and the list index for missing or null fields", () => {
    expect(
      parsePlayersEvent({
        players: [
          { id: 1 },
          { id: 2, username: null, name: null, position: null },
          { id: 3, username: null, name: "Carol" },
        ],
      }),
    ).toEqual([
      { id: 1, name: "", position: 0 },
      { id: 2, name: "", position: 1 },
      { id: 3, name: "Carol", position: 2 },
    ]);
  });

  it("returns an empty roster for an empty list", () => {
    expect(parsePlayersEvent({ players: [] })).toEqual([]);
  });

  it("reports no roster when the event has neither players nor items", () => {
    expect(parsePlayersEvent({ count: 0 })).toBe("no-roster");
  });

  it.each([
    ["an object username", { id: 1, username: { first: "A" } }],
    ["an object name", { id: 1, name: { first: "A" } }],
    ["a number name", { id: 1, name: 42 }],
    ["a string position", { id: 1, name: "A", position: "1" }],
    ["a non-integer position", { id: 1, name: "A", position: 1.5 }],
    ["a negative position", { id: 1, name: "A", position: -1 }],
    ["a missing id", { name: "A" }],
    ["a string id", { id: "1", name: "A" }],
    ["a non-integer id", { id: 1.5, name: "A" }],
  ])("rejects the whole event for a player with %s", (_case, badPlayer) => {
    expect(parsePlayersEvent({ players: [{ id: 2, name: "Valid", position: 0 }, badPlayer] })).toBe(
      "invalid",
    );
  });

  it.each([
    ["players that is not an array", { players: { id: 1 } }],
    ["players that is null", { players: null }],
    ["items that is not an array", { items: "nope", players: [] }],
    ["a non-object entry", { players: [1] }],
    ["a null payload", null],
    ["a string payload", "players"],
    ["an array payload", [{ id: 1 }]],
  ])("rejects a malformed event: %s", (_case, payload) => {
    expect(parsePlayersEvent(payload)).toBe("invalid");
  });
});
