// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePlayerThrowsDisplay } from "./usePlayerThrowsDisplay";

const bustIcon = <span data-testid="bust-icon">X</span>;

describe("usePlayerThrowsDisplay", () => {
  it("should not backfill throw2 and throw3 when the current round already has throws", () => {
    const { result } = renderHook(() =>
      usePlayerThrowsDisplay({
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
      }),
    );

    expect(result.current.throw1).toBe(25);
    expect(result.current.throw2).toEqual(bustIcon);
    expect(result.current.throw3).toEqual(bustIcon);
  });

  it("should fall back to previous round when the current round has no throws", () => {
    const { result } = renderHook(() =>
      usePlayerThrowsDisplay({
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
      }),
    );

    expect(result.current.throw1).toBe(20);
    expect(result.current.throw2).toBe(19);
    expect(result.current.throw3).toBe(18);
  });

  it("should react to player bust flag when individual throw bust flags are missing", () => {
    const { result } = renderHook(() =>
      usePlayerThrowsDisplay({
        isActive: false,
        isBust: true,
        roundsCountLength: 2,
        currentThrow1: 25,
        currentThrow2: undefined,
        currentThrow3: undefined,
        prevThrow1: undefined,
        prevThrow2: undefined,
        prevThrow3: undefined,
        throw1IsBust: undefined,
        throw2IsBust: undefined,
        throw3IsBust: undefined,
        prevThrow1IsBust: undefined,
        prevThrow2IsBust: undefined,
        prevThrow3IsBust: undefined,
        bustIcon,
      }),
    );

    expect(result.current.throw1).toBe(25);
    expect(result.current.throw2).toEqual(bustIcon);
    expect(result.current.throw3).toEqual(bustIcon);
    expect(result.current.throw1IsBust).toBe(true);
  });
});
