// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatRoundAverage, getCompletedRounds } from "./roundAverage";
import type { WinnerPlayerProps } from "@/types";

function buildPlayer(overrides: Partial<WinnerPlayerProps> = {}): WinnerPlayerProps {
  return {
    id: 1,
    name: "Player 1",
    score: 0,
    isActive: false,
    index: 0,
    rounds: [],
    ...overrides,
  };
}

describe("roundAverage", () => {
  it("returns only completed rounds when the last round is unfinished", () => {
    const player = buildPlayer({
      rounds: [{ throw1: 60 }, {}],
    });

    expect(getCompletedRounds(player)).toBe(1);
  });

  it("formats the backend three-dart average with two decimals", () => {
    const player = buildPlayer({ scoreAverage: 60.6, roundCount: 2 });

    expect(formatRoundAverage(player)).toBe("60.60");
  });

  it("rounds the backend value to two decimals", () => {
    const player = buildPlayer({ scoreAverage: 42.345, roundCount: 2 });

    expect(formatRoundAverage(player)).toBe("42.34");
  });

  it("formats 0.00 when the player has rounds and an average of 0", () => {
    const player = buildPlayer({ scoreAverage: 0, roundCount: 3 });

    expect(formatRoundAverage(player)).toBe("0.00");
  });

  it("formats a dash when the player played no rounds", () => {
    const player = buildPlayer({ scoreAverage: 0, roundCount: 0 });

    expect(formatRoundAverage(player)).toBe("-");
  });

  it("formats a dash when the round count is missing", () => {
    const player = buildPlayer({ scoreAverage: 45, rounds: [{}] });

    expect(formatRoundAverage(player)).toBe("-");
  });

  it("does not derive an average from the score when the backend sends none", () => {
    const player = buildPlayer({
      score: 201,
      roundCount: 2,
      rounds: [{ throw1: 60 }, { throw1: 40 }],
    });

    expect(formatRoundAverage(player)).toBe("-");
  });
});
