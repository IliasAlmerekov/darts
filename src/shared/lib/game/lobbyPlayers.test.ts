// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildBackendPlayer } from "@/shared/types/game.test-support";
import { sortLobbyPlayers, toLobbyPlayers } from "./lobbyPlayers";

describe("sortLobbyPlayers", () => {
  it("should order players by position and put players without one last", () => {
    expect(
      sortLobbyPlayers([
        { id: 3, name: "Cara", position: null },
        { id: 2, name: "Bob", position: 1 },
        { id: 1, name: "Alice", position: 0 },
      ]),
    ).toEqual([
      { id: 1, name: "Alice", position: 0 },
      { id: 2, name: "Bob", position: 1 },
      { id: 3, name: "Cara", position: null },
    ]);
  });
});

describe("toLobbyPlayers", () => {
  it("should keep only id, name and position, in position order", () => {
    expect(
      toLobbyPlayers([
        buildBackendPlayer({ id: 2, name: "Bob", position: 1, score: 301 }),
        buildBackendPlayer({ id: 1, name: "Alice", position: 0, isActive: true }),
      ]),
    ).toEqual([
      { id: 1, name: "Alice", position: 0 },
      { id: 2, name: "Bob", position: 1 },
    ]);
  });
});
