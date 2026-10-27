// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isGameMode, isStartScore, resolveGameMode, toGameModeFlags } from "./gameMode";

describe("gameMode", () => {
  it.each([
    [false, false, "single-out"],
    [true, false, "double-out"],
    [false, true, "triple-out"],
    [true, true, "double-out"],
  ] as const)("resolves doubleOut %s and tripleOut %s to %s", (doubleOut, tripleOut, mode) => {
    expect(resolveGameMode(doubleOut, tripleOut)).toBe(mode);
  });

  it.each(["single-out", "double-out", "triple-out"] as const)(
    "turns %s into flags that resolve back to it",
    (mode) => {
      const { doubleOut, tripleOut } = toGameModeFlags(mode);
      expect(resolveGameMode(doubleOut, tripleOut)).toBe(mode);
    },
  );

  it("accepts only the offered options", () => {
    expect(isGameMode("double-out")).toBe(true);
    expect(isGameMode("quadruple-out")).toBe(false);
    expect(isGameMode(301)).toBe(false);
    expect(isStartScore(501)).toBe(true);
    expect(isStartScore("501")).toBe(false);
    expect(isStartScore(999)).toBe(false);
  });
});
