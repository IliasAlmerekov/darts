// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildHitDistribution } from "@/shared/types/player.test-support";
import { drawsHitDots, sectorHits, topHitFields } from "./hitFields";

describe("drawsHitDots", () => {
  it("draws dots up to 150 hits and fills the board fields above", () => {
    expect(drawsHitDots(buildHitDistribution())).toBe(true);
    expect(drawsHitDots(buildHitDistribution({ T20: 100, BULL: 50 }))).toBe(true);
    expect(drawsHitDots(buildHitDistribution({ T20: 100, BULL: 51 }))).toBe(false);
  });
});

describe("topHitFields", () => {
  it("lists the five most hit board fields, most hits first, with their labels", () => {
    expect(
      topHitFields(
        buildHitDistribution({ S20: 48, T20: 26, D20: 12, BULL: 5, BULLSEYE: 2, S1: 1 }),
      ),
    ).toEqual([
      { field: "S20", label: "S20", hits: 48 },
      { field: "T20", label: "T20", hits: 26 },
      { field: "D20", label: "D20", hits: 12 },
      { field: "BULL", label: "Bull", hits: 5 },
      { field: "BULLSEYE", label: "Bullseye", hits: 2 },
    ]);
  });

  it("keeps board field order on a tie and leaves out fields without hits", () => {
    expect(topHitFields(buildHitDistribution({ T19: 3, S5: 3, BULLSEYE: 3 }))).toEqual([
      { field: "S5", label: "S5", hits: 3 },
      { field: "T19", label: "T19", hits: 3 },
      { field: "BULLSEYE", label: "Bullseye", hits: 3 },
    ]);
    expect(topHitFields(buildHitDistribution())).toEqual([]);
  });
});

describe("sectorHits", () => {
  const hitDistribution = buildHitDistribution({
    S20: 48,
    D20: 12,
    T20: 26,
    T1: 4,
    BULL: 5,
    BULLSEYE: 2,
  });

  it("sums a number sector and splits it into single, double and triple", () => {
    expect(sectorHits(hitDistribution, 20)).toEqual({
      name: "Sector 20",
      hits: 86,
      rows: [
        { label: "Single 20", hits: 48 },
        { label: "Double 20", hits: 12 },
        { label: "Triple 20", hits: 26 },
      ],
    });
    expect(sectorHits(hitDistribution, 5).hits).toBe(0);
  });

  it("sums the centre and splits it into Bull and Bullseye", () => {
    expect(sectorHits(hitDistribution, "BULL")).toEqual({
      name: "Bull",
      hits: 7,
      rows: [
        { label: "Bull", hits: 5 },
        { label: "Bullseye", hits: 2 },
      ],
    });
  });
});
