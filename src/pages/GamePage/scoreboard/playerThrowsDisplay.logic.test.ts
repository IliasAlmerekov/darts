// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getPlayerThrowsDisplay } from "./playerThrowsDisplay.logic";

describe("getPlayerThrowsDisplay", () => {
  it("should not backfill throw2/throw3 from previous round when current round already has throws", () => {
    const result = getPlayerThrowsDisplay({
      isActive: false,
      currentRound: { throw1: 25, throw1IsBust: true, throw2IsBust: false, throw3IsBust: false },
      previousRound: {
        throw1: 25,
        throw2: 25,
        throw3: 25,
        throw1IsBust: false,
        throw2IsBust: false,
        throw3IsBust: false,
      },
    });

    expect(result).toEqual([
      { kind: "value", label: "25", isBust: true },
      { kind: "bust-icon", isBust: false },
      { kind: "bust-icon", isBust: false },
    ]);
  });

  it("should fall back to previous round only when current round has no throws", () => {
    const result = getPlayerThrowsDisplay({
      isActive: false,
      currentRound: undefined,
      previousRound: {
        throw1: 20,
        throw2: 19,
        throw3: 18,
        throw1IsBust: false,
        throw2IsBust: false,
        throw3IsBust: false,
      },
    });

    expect(result).toEqual([
      { kind: "value", label: "20", isBust: false },
      { kind: "value", label: "19", isBust: false },
      { kind: "value", label: "18", isBust: false },
    ]);
  });

  it("should clear previous throws for the active player in later rounds", () => {
    const result = getPlayerThrowsDisplay({
      isActive: true,
      currentRound: undefined,
      previousRound: {
        throw1: 60,
        throw2: 60,
        throw3: 60,
        throw1IsBust: false,
        throw2IsBust: false,
        throw3IsBust: false,
      },
    });

    expect(result).toEqual([
      { kind: "empty", isBust: false },
      { kind: "empty", isBust: false },
      { kind: "empty", isBust: false },
    ]);
  });

  it("should show empty slots for active player with no current throws when in round 2", () => {
    const result = getPlayerThrowsDisplay({
      isActive: true,
      currentRound: undefined,
      previousRound: { throw1: 20, throw1IsBust: false, throw2IsBust: false, throw3IsBust: false },
    });

    expect(result).toEqual([
      { kind: "empty", isBust: false },
      { kind: "empty", isBust: false },
      { kind: "empty", isBust: false },
    ]);
  });

  it("should show empty slots for active player with no current throws when in round 1", () => {
    const result = getPlayerThrowsDisplay({
      isActive: true,
      currentRound: undefined,
      previousRound: undefined,
    });

    expect(result).toEqual([
      { kind: "empty", isBust: false },
      { kind: "empty", isBust: false },
      { kind: "empty", isBust: false },
    ]);
  });

  it("should still show current throws for active player when throws exist", () => {
    const result = getPlayerThrowsDisplay({
      isActive: true,
      currentRound: { throw1: 20, throw1IsBust: false },
      previousRound: {
        throw1: 25,
        throw2: 25,
        throw3: 25,
        throw1IsBust: false,
        throw2IsBust: false,
        throw3IsBust: false,
      },
    });

    expect(result).toEqual([
      { kind: "value", label: "20", isBust: false },
      { kind: "empty", isBust: false },
      { kind: "empty", isBust: false },
    ]);
  });

  it("should still show prev round fallback for inactive player with no current throws", () => {
    const result = getPlayerThrowsDisplay({
      isActive: false,
      currentRound: {},
      previousRound: {
        throw1: 25,
        throw2: 25,
        throw3: 25,
        throw1IsBust: false,
        throw2IsBust: false,
        throw3IsBust: false,
      },
    });

    expect(result).toEqual([
      { kind: "value", label: "25", isBust: false },
      { kind: "value", label: "25", isBust: false },
      { kind: "value", label: "25", isBust: false },
    ]);
  });

  it("should infer bust styling from player bust flag when backend omits throw bust flags", () => {
    const result = getPlayerThrowsDisplay({
      isActive: false,
      isBust: true,
      currentRound: { throw1: 25 },
      previousRound: undefined,
    });

    expect(result).toEqual([
      { kind: "value", label: "25", isBust: true },
      { kind: "bust-icon", isBust: false },
      { kind: "bust-icon", isBust: false },
    ]);
  });

  it("should infer bust styling from previous round fallback when backend omits throw bust flags", () => {
    const result = getPlayerThrowsDisplay({
      isActive: false,
      isBust: true,
      currentRound: undefined,
      previousRound: { throw1: 25 },
    });

    expect(result).toEqual([
      { kind: "value", label: "25", isBust: true },
      { kind: "bust-icon", isBust: false },
      { kind: "bust-icon", isBust: false },
    ]);
  });

  it("should label doubles with D, triples with T and keep a zero throw", () => {
    const result = getPlayerThrowsDisplay({
      isActive: false,
      currentRound: {
        throw1: 20,
        throw1IsDouble: true,
        throw2: 19,
        throw2IsTriple: true,
        throw3: 0,
      },
      previousRound: undefined,
    });

    expect(result).toEqual([
      { kind: "value", label: "D20", isBust: false },
      { kind: "value", label: "T19", isBust: false },
      { kind: "value", label: "0", isBust: false },
    ]);
  });

  it("should replace slot 3 with the bust icon when slot 2 is bust", () => {
    const result = getPlayerThrowsDisplay({
      isActive: false,
      currentRound: { throw1: 20, throw2: 19, throw2IsBust: true },
      previousRound: undefined,
    });

    expect(result).toEqual([
      { kind: "value", label: "20", isBust: false },
      { kind: "value", label: "19", isBust: true },
      { kind: "bust-icon", isBust: false },
    ]);
  });
});
