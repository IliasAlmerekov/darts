// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildPlayerProfileStats } from "@/shared/types/player.test-support";
import { toBoardHitFrequencies } from "./hitFrequency";

type HitDistribution = ReturnType<typeof buildPlayerProfileStats>["hitDistribution"];

/** Every board field with 0 hits, then the given counts. */
function distribution(hits: Record<string, number>): HitDistribution {
  return buildPlayerProfileStats().hitDistribution.map(({ field }) => ({
    field,
    hits: hits[field] ?? 0,
  }));
}

describe("toBoardHitFrequencies", () => {
  it("gives each board field a step from its share of the most hit spot, at each threshold", () => {
    const fields = toBoardHitFrequencies(
      distribution({ T20: 100, S1: 80, D18: 79, T4: 60, S13: 40, D6: 20, T10: 19 }),
    );

    expect([
      fields.T20,
      fields.S1,
      fields.D18,
      fields.T4,
      fields.S13,
      fields.D6,
      fields.T10,
      fields.S15,
    ]).toEqual([0, 0, 1, 1, 2, 3, 4, 4]);
  });

  it("gives T20 Very high and S20 and D20 Very low when T20 has the only hits", () => {
    const fields = toBoardHitFrequencies(distribution({ T20: 12 }));

    expect([fields.T20, fields.S20, fields.D20]).toEqual([0, 4, 4]);
  });

  it("gives the single, double and treble of one number each their own step", () => {
    const fields = toBoardHitFrequencies(distribution({ S20: 30, D20: 10, T20: 50 }));

    expect([fields.T20, fields.S20, fields.D20]).toEqual([0, 1, 3]);
  });

  it("gives every board field Very low without any hit", () => {
    const frequencies = toBoardHitFrequencies(distribution({}));

    expect(Object.keys(frequencies)).toHaveLength(62);
    expect(new Set(Object.values(frequencies))).toEqual(new Set([4]));
  });

  it("gives Bull and Bullseye each their own step, on the board field scale", () => {
    const frequencies = toBoardHitFrequencies(distribution({ BULL: 200, BULLSEYE: 1 }));

    expect([frequencies.BULL, frequencies.BULLSEYE]).toEqual([0, 4]);
  });

  it("compares Bull and Bullseye with the most hit board field, not with their sum", () => {
    const frequencies = toBoardHitFrequencies(distribution({ T20: 100, BULL: 20, BULLSEYE: 41 }));

    expect([frequencies.T20, frequencies.BULL, frequencies.BULLSEYE]).toEqual([0, 3, 2]);
  });
});
