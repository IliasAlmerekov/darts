// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePlayerThrowsDisplay } from "./usePlayerThrowsDisplay";

const bustIcon = <span data-testid="bust-icon">X</span>;

describe("usePlayerThrowsDisplay", () => {
  it("does not backfill throw2/throw3 from previous round when current round already has throws", () => {
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

  it("falls back to previous round only when current round has no throws", () => {
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
});
