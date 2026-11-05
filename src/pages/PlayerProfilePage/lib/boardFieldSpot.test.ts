// @vitest-environment node
import { describe, expect, it } from "vitest";
import { boardFieldSpot } from "./boardFieldSpot";
import type { NumberField } from "./hitFrequency";

// A regulation board, clockwise from 20 at the top; every segment spans 18°.
const BOARD_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;
const HALF_SEGMENT = 9;
const DOT_RADIUS = 4;
// Ring radii in board millimetres.
const RINGS = {
  innerSingle: [16, 99],
  treble: [99, 107],
  outerSingle: [107, 162],
  double: [162, 170],
} as const;
// Floating-point slack only: a dot may touch a ring edge, never cross it.
const EPSILON = 1e-9;

const FIELDS = BOARD_ORDER.flatMap((number) =>
  (["S", "D", "T"] as const).map((ring): NumberField => `${ring}${number}`),
);

interface Polar {
  radius: number;
  /** Degrees clockwise from the segment's centre line. */
  offset: number;
}

function polar(field: NumberField): Polar {
  const { x, y } = boardFieldSpot(field);
  const segment = field.slice(1);
  const centre = BOARD_ORDER.findIndex((number) => String(number) === segment) * 2 * HALF_SEGMENT;
  // 0° points up (negative y), angles grow clockwise, as on the board.
  const angle = (Math.atan2(x, -y) * 180) / Math.PI;
  const offset = ((((angle - centre) % 360) + 540) % 360) - 180;
  return { radius: Math.hypot(x, y), offset };
}

function dotFitsRing(radius: number, [inner, outer]: readonly [number, number]): boolean {
  return radius - DOT_RADIUS >= inner - EPSILON && radius + DOT_RADIUS <= outer + EPSILON;
}

describe("boardFieldSpot", () => {
  it.each(FIELDS)("keeps the whole dot of %s inside its ring", (field) => {
    const { radius } = polar(field);

    if (field.startsWith("T")) {
      expect(dotFitsRing(radius, RINGS.treble)).toBe(true);
    } else if (field.startsWith("D")) {
      expect(dotFitsRing(radius, RINGS.double)).toBe(true);
    } else {
      expect(dotFitsRing(radius, RINGS.innerSingle) || dotFitsRing(radius, RINGS.outerSingle)).toBe(
        true,
      );
    }
  });

  it.each(FIELDS)("keeps the whole dot of %s inside its segment's angle", (field) => {
    const { radius, offset } = polar(field);
    // The distance from the dot's centre to the nearer segment edge line.
    const toEdge = radius * Math.sin(((HALF_SEGMENT - Math.abs(offset)) * Math.PI) / 180);

    expect(Math.abs(offset)).toBeLessThan(HALF_SEGMENT);
    expect(toEdge).toBeGreaterThanOrEqual(DOT_RADIUS);
  });

  it("puts no spot on its segment's centre line", () => {
    const offsets = FIELDS.map((field) => Math.abs(polar(field).offset));

    expect(Math.min(...offsets)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...offsets)).toBeLessThanOrEqual(4);
  });

  it("returns the same position for the same board field", () => {
    expect(FIELDS.map((field) => boardFieldSpot(field))).toEqual(
      FIELDS.map((field) => boardFieldSpot(field)),
    );
  });

  it("spreads the singles over both single fields and different radii", () => {
    const radii = FIELDS.filter((field) => field.startsWith("S")).map(
      (field) => polar(field).radius,
    );

    expect(new Set(radii.map((radius) => Math.round(radius))).size).toBeGreaterThan(5);
    expect(radii.some((radius) => radius < RINGS.treble[0])).toBe(true);
    expect(radii.some((radius) => radius > RINGS.treble[1])).toBe(true);
  });

  it("spreads the spots to both sides of the centre line", () => {
    const offsets = FIELDS.map((field) => polar(field).offset);

    expect(offsets.some((offset) => offset < 0)).toBe(true);
    expect(offsets.some((offset) => offset > 0)).toBe(true);
  });
});
