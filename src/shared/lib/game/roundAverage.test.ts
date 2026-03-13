// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUND_AVERAGE_START_SCORE,
  formatRoundAverage,
  getCompletedRounds,
} from "./roundAverage";
import type { WinnerPlayerProps } from "@/types";

function buildPlayer(overrides: Partial<WinnerPlayerProps> = {}): WinnerPlayerProps {
  return {
    id: 1,
    name: "Player 1",
    score: DEFAULT_ROUND_AVERAGE_START_SCORE,
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

  it("formats zero average when there are no completed rounds", () => {
    const player = buildPlayer();

    expect(formatRoundAverage(player)).toBe("0.00");
  });

  it("uses the named default start score when scoreAverage is missing", () => {
    const player = buildPlayer({
      score: 201,
      rounds: [{ throw1: 60 }, { throw1: 40 }],
    });

    expect(formatRoundAverage(player)).toBe("50.00");
  });

  it("prefers backend scoreAverage over calculated fallback", () => {
    const player = buildPlayer({
      score: 201,
      scoreAverage: 42.345,
      rounds: [{ throw1: 60 }, { throw1: 40 }],
    });

    expect(formatRoundAverage(player, 501)).toBe("42.34");
  });
});
