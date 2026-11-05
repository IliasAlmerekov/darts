// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { PlayerProfile } from "@/lib/player/profile";
import { BOARD_FIELDS } from "@/shared/types/player.test-support";
import { boardFieldSpot } from "./boardFieldSpot";
import { toHitDots, type HitDot } from "./hitDots";
import type { NumberField } from "./hitFrequency";

type HitDistribution = PlayerProfile["hitDistribution"];
type BoardField = HitDistribution[number]["field"];

// A regulation board, clockwise from 20 at the top; every segment spans 18°.
const BOARD_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;
const HALF_SEGMENT = 9;
const DOT_RADIUS = 2;
// Ring radii in board millimetres.
const RINGS = {
  // A disc: a dot may cover the centre point.
  bullseye: [-DOT_RADIUS, 6.4],
  bull: [6.4, 16],
  innerSingle: [16, 99],
  treble: [99, 107],
  outerSingle: [107, 162],
  double: [162, 170],
} as const;
// Floating-point slack only: a dot may touch an edge, never cross it.
const EPSILON = 1e-9;

function board(hits: Partial<Record<BoardField, number>>): HitDistribution {
  return BOARD_FIELDS.map((field) => ({ field, hits: hits[field] ?? 0 }));
}

function dotsOf(dots: HitDot[], field: BoardField): HitDot[] {
  return dots.filter((dot) => dot.field === field);
}

interface Polar {
  radius: number;
  /** Degrees clockwise from the segment's centre line. */
  offset: number;
}

function polar(field: NumberField, { x, y }: { x: number; y: number }): Polar {
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

/** The ring a board field's dots must stay in; a single keeps to the side of its spot. */
function ringOf(field: BoardField): readonly [number, number] {
  if (field === "BULLSEYE") return RINGS.bullseye;
  if (field === "BULL") return RINGS.bull;
  if (field.startsWith("T")) return RINGS.treble;
  if (field.startsWith("D")) return RINGS.double;
  const { x, y } = boardFieldSpot(field);
  return Math.hypot(x, y) < RINGS.treble[0] ? RINGS.innerSingle : RINGS.outerSingle;
}

/** The board fields whose dots cross their ring or their segment's edges. */
function fieldsOutside(dots: HitDot[]): BoardField[] {
  const outside = dots.filter((dot) => {
    const ring = ringOf(dot.field);
    if (dot.field === "BULL" || dot.field === "BULLSEYE") {
      return !dotFitsRing(Math.hypot(dot.x, dot.y), ring);
    }
    const { radius, offset } = polar(dot.field, dot);
    // The distance from the dot's centre to the nearer segment edge line.
    const toEdge = radius * Math.sin(((HALF_SEGMENT - Math.abs(offset)) * Math.PI) / 180);
    return (
      !dotFitsRing(radius, ring) ||
      Math.abs(offset) >= HALF_SEGMENT ||
      toEdge < DOT_RADIUS - EPSILON
    );
  });
  return [...new Set(outside.map((dot) => dot.field))];
}

describe("toHitDots", () => {
  it.each(["S20", "D20", "T20", "BULL", "BULLSEYE"] as const)(
    "keeps every whole dot of %s inside its board field",
    (field) => {
      const dots = toHitDots(board({ [field]: 400 }));

      expect(dotsOf(dots, field)).toHaveLength(400);
      expect(fieldsOutside(dots)).toEqual([]);
    },
  );

  it.each([1, 2, 5, 9])(
    "keeps every whole dot inside its board field with %i hits on every field",
    (hits) => {
      const dots = toHitDots(board(Object.fromEntries(BOARD_FIELDS.map((field) => [field, hits]))));

      expect(dots).toHaveLength(62 * hits);
      expect(fieldsOutside(dots)).toEqual([]);
    },
  );

  it("returns the same positions for the same hit distribution", () => {
    const hits = board({ T20: 40, S20: 25, D16: 12, BULL: 7, BULLSEYE: 3 });

    expect(toHitDots(hits)).toEqual(toHitDots(hits));
  });

  it("keeps a board field's dots in place when it gets one more hit", () => {
    const before = toHitDots(board({ T20: 40, S5: 20, BULL: 8 }));
    const after = toHitDots(board({ T20: 41, S5: 20, BULL: 8 }));

    expect(dotsOf(after, "T20")).toHaveLength(41);
    expect(dotsOf(after, "T20").slice(0, 40)).toEqual(dotsOf(before, "T20"));
    expect(dotsOf(after, "S5")).toEqual(dotsOf(before, "S5"));
    expect(dotsOf(after, "BULL")).toEqual(dotsOf(before, "BULL"));
  });

  it("draws one dot per hit on a board with 300 hits", () => {
    const dots = toHitDots(board({ T20: 150, S20: 100, D20: 30, BULL: 15, BULLSEYE: 5 }));

    expect(dots).toHaveLength(300);
    expect(dotsOf(dots, "T20")).toHaveLength(150);
    expect(dotsOf(dots, "BULLSEYE")).toHaveLength(5);
  });

  it("draws at most 600 dots plus the one-dot minimums on a board with 3000 hits", () => {
    // Nine board fields with one hit each would get 1.8 dots between them; each keeps one.
    const lowFields = ["S1", "S2", "S3", "S4", "S6", "S7", "S8", "S9", "S10"] as const;
    const dots = toHitDots(
      board({
        T20: 1991,
        S20: 600,
        D20: 400,
        ...Object.fromEntries(lowFields.map((field) => [field, 1])),
      }),
    );

    expect(dots.length).toBeGreaterThanOrEqual(600);
    expect(dots.length).toBeLessThanOrEqual(600 + lowFields.length);
    for (const field of lowFields) {
      expect(dotsOf(dots, field)).toHaveLength(1);
    }
    // 1991 of 3000 hits, about 398 of the 600 dots.
    expect(dotsOf(dots, "T20").length).toBeGreaterThanOrEqual(397);
    expect(dotsOf(dots, "T20").length).toBeLessThanOrEqual(399);
    expect(dotsOf(dots, "S5")).toHaveLength(0);
  });

  it.each(["S20", "S3", "S11", "S6"] as const)(
    "spreads the dots of %s around its spot by about 6 mm",
    (field) => {
      const spot = boardFieldSpot(field);
      const dots = toHitDots(board({ [field]: 500 }));
      const meanSquare =
        dots.reduce((sum, { x, y }) => sum + (x - spot.x) ** 2 + (y - spot.y) ** 2, 0) /
        dots.length;
      const rms = Math.sqrt(meanSquare);

      expect(rms).toBeGreaterThan(3);
      expect(rms).toBeLessThan(10);
    },
  );

  it("puts no dot on a board field without hits", () => {
    expect(toHitDots(board({}))).toEqual([]);
  });
});
