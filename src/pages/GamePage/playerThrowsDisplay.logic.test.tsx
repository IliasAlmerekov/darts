// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getPlayerThrowsDisplay } from "./playerThrowsDisplay.logic";

const bustIcon = <span data-testid="bust-icon">X</span>;

describe("getPlayerThrowsDisplay", () => {
  it("should not backfill throw2/throw3 from previous round when current round already has throws", () => {
    const result = getPlayerThrowsDisplay({
      isActive: false,
      roundsCountLength: 2,
      currentThrow1: 25,
      currentThrow2: undefined,
      currentThrow3: undefined,
      prevThrow1: 25,
      prevThrow2: 25,
      prevThrow3: 25,
      throw1IsBust: true,
      throw2IsBust: false,
      throw3IsBust: false,
      prevThrow1IsBust: false,
      prevThrow2IsBust: false,
      prevThrow3IsBust: false,
      bustIcon,
    });

    expect(result.throw1).toBe(25);
    expect(result.throw2).toEqual(bustIcon);
    expect(result.throw3).toEqual(bustIcon);
  });

  it("should fall back to previous round only when current round has no throws", () => {
    const result = getPlayerThrowsDisplay({
      isActive: false,
      roundsCountLength: 2,
      currentThrow1: undefined,
      currentThrow2: undefined,
      currentThrow3: undefined,
      prevThrow1: 20,
      prevThrow2: 19,
      prevThrow3: 18,
      throw1IsBust: undefined,
      throw2IsBust: undefined,
      throw3IsBust: undefined,
      prevThrow1IsBust: false,
      prevThrow2IsBust: false,
      prevThrow3IsBust: false,
      bustIcon,
    });

    expect(result.throw1).toBe(20);
    expect(result.throw2).toBe(19);
    expect(result.throw3).toBe(18);
  });

  it("should clear previous throws for the active player in later rounds", () => {
    const result = getPlayerThrowsDisplay({
      isActive: true,
      roundsCountLength: 3,
      currentThrow1: undefined,
      currentThrow2: undefined,
      currentThrow3: undefined,
      prevThrow1: 60,
      prevThrow2: 60,
      prevThrow3: 60,
      throw1IsBust: undefined,
      throw2IsBust: undefined,
      throw3IsBust: undefined,
      prevThrow1IsBust: false,
      prevThrow2IsBust: false,
      prevThrow3IsBust: false,
      bustIcon,
    });

    expect(result.throw1).toBeUndefined();
    expect(result.throw2).toBeUndefined();
    expect(result.throw3).toBeUndefined();
  });
});
