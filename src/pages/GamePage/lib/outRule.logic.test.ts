import { describe, expect, it } from "vitest";
import { allowsCheckoutWith, isDeadScore } from "./outRule.logic";

describe("out rules", () => {
  it.each([
    ["single-out", [false, false, false, false, false], [true, true, true]],
    ["double-out", [false, true, false, false, false], [false, true, false]],
    ["triple-out", [false, true, true, false, false], [false, false, true]],
  ] as const)("applies %s", (mode, dead, allowed) => {
    expect([0, 1, 2, 3, 50].map((score) => isDeadScore(score, mode))).toEqual(dead);
    expect(
      (["single", "double", "triple"] as const).map((ring) => allowsCheckoutWith(ring, mode)),
    ).toEqual(allowed);
  });
});
