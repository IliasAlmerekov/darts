// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mergePlayerOrder, orderByPosition } from "./playerOrder";

describe("playerOrder", () => {
  it("should sort ids by position and put players without a position last", () => {
    expect(
      orderByPosition([
        { id: 3, position: null },
        { id: 1, position: 2 },
        { id: 2, position: 1 },
      ]),
    ).toEqual([2, 1, 3]);
  });

  it("should keep the dragged order, drop players who left and append new players", () => {
    const players = [
      { id: 1, position: 1 },
      { id: 2, position: 2 },
      { id: 4, position: 3 },
    ];

    expect(mergePlayerOrder([2, 3, 1], players)).toEqual([2, 1, 4]);
  });

  it("should return the previous array when the order is unchanged", () => {
    const previousOrder = [2, 1];

    expect(
      mergePlayerOrder(previousOrder, [
        { id: 1, position: 1 },
        { id: 2, position: 2 },
      ]),
    ).toBe(previousOrder);
  });
});
