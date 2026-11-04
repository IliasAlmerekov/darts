// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildBackendPlayer } from "@/shared/types/game.test-support";
import { sortRoster, toRoster } from "./roster";

describe("sortRoster", () => {
  it("should order players by position and put players without one last", () => {
    expect(
      sortRoster([
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

describe("toRoster", () => {
  it("should keep only id, name and position, in position order", () => {
    expect(
      toRoster([
        buildBackendPlayer({ id: 2, name: "Bob", position: 1, score: 301 }),
        buildBackendPlayer({ id: 1, name: "Alice", position: 0, isActive: true }),
      ]),
    ).toEqual([
      { id: 1, name: "Alice", position: 0 },
      { id: 2, name: "Bob", position: 1 },
    ]);
  });
});
