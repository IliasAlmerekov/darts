// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildPlayerProfileStats } from "@/shared/types/player.test-support";
import { toBoardHitFrequencies } from "./hitFrequency";

type HitDistribution = ReturnType<typeof buildPlayerProfileStats>["hitDistribution"];

/** Every segment with 0 hits, then the given counts. */
function distribution(hits: Record<string, number>): HitDistribution {
  return buildPlayerProfileStats().hitDistribution.map(({ segment }) => ({
    segment,
    hits: hits[segment] ?? 0,
  }));
}

describe("toBoardHitFrequencies", () => {
  it("gives each segment a step from its share of the most hit spot, at each threshold", () => {
    const { segments } = toBoardHitFrequencies(
      distribution({ "20": 100, "1": 80, "18": 79, "4": 60, "13": 40, "6": 20, "10": 19 }),
    );

    expect([
      segments["20"],
      segments["1"],
      segments["18"],
      segments["4"],
      segments["13"],
      segments["6"],
      segments["10"],
      segments["15"],
    ]).toEqual([0, 0, 1, 1, 2, 3, 4, 4]);
  });

  it("shows no spot anywhere without any hit", () => {
    const { segments, bull } = toBoardHitFrequencies(distribution({}));

    expect(new Set(Object.values(segments))).toEqual(new Set([4]));
    expect(bull).toBe(4);
  });

  it("adds Bull and Bullseye hits into the one centre spot", () => {
    const { segments, bull } = toBoardHitFrequencies(
      distribution({ "20": 45, BULL: 30, BULLSEYE: 30 }),
    );

    expect(bull).toBe(0);
    expect(segments["20"]).toBe(1);
    expect(segments.BULL).toBeUndefined();
  });
});
