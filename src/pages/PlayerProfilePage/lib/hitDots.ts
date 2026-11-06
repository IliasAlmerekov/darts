import type { PlayerProfile } from "@/lib/player/profile";
import {
  boardFieldSpot,
  BULL_RADIUS,
  DOUBLE_INNER,
  DOUBLE_OUTER,
  hash,
  OUTER_BULL_RADIUS,
  pointAt,
  SEGMENT_ANGLE,
  segmentCentre,
  TREBLE_INNER,
  TREBLE_OUTER,
} from "./boardFieldSpot";
import type { BoardField, NumberField } from "./hitFrequency";

/** The part of a hit dot kept inside its board field, in board millimetres. */
const HIT_DOT_RADIUS = 2;
// Dot centres keep 0.3 mm more than the radius from every edge, so a dot's core stays in its field.
const DOT_EDGE = HIT_DOT_RADIUS + 0.3;
/** The most dots a board draws before each board field's share shrinks. */
const DOT_BUDGET = 600;
/** The spread of a number field's dots around its spot, in millimetres per axis. */
const SPREAD = 6;
/** Draws per dot before a dot that keeps leaving its board field falls back to a fixed point. */
const MAX_DRAWS = 12;

export interface HitDot {
  field: BoardField;
  /** The hit's index within its board field; with `field` it seeds the position. */
  index: number;
  /** Board millimetres from the centre, with y pointing down. */
  x: number;
  y: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Two uniform values from the 16-bit halves of a hash: the first in (0, 1], so Box-Muller
 * can take its logarithm, the second in [0, 1).
 */
function uniforms(seed: string): [number, number] {
  const value = hash(seed);
  return [((value & 0xffff) + 1) / 0x10000, (value >>> 16) / 0x10000];
}

/**
 * How many dots each entry gets: one per hit while the board fits the budget, otherwise a
 * share of the budget by largest remainder, with at least one dot for an entry with hits.
 */
function dotCounts(hitDistribution: PlayerProfile["hitDistribution"]): number[] {
  const hits = hitDistribution.map((entry) => Math.max(0, entry.hits));
  const total = hits.reduce((sum, count) => sum + count, 0);
  if (total <= DOT_BUDGET) {
    return hits;
  }
  const parts = hits.map((count, order) => {
    const quota = (count * DOT_BUDGET) / total;
    return { order, hits: count, count: Math.floor(quota), remainder: quota - Math.floor(quota) };
  });
  const remaining = DOT_BUDGET - parts.reduce((sum, part) => sum + part.count, 0);
  const byRemainder = [...parts].sort((a, b) => b.remainder - a.remainder || a.order - b.order);
  for (const part of byRemainder.slice(0, remaining)) {
    part.count += 1;
  }
  return parts.map((part) => (part.hits > 0 ? Math.max(1, part.count) : 0));
}

/** The radii a number field's dot centres may take, the painted dot inside its ring. */
function dotRadii(field: NumberField, spot: Point): [number, number] {
  const ring = field.charAt(0);
  const [inner, outer] =
    ring === "T"
      ? [TREBLE_INNER, TREBLE_OUTER]
      : ring === "D"
        ? [DOUBLE_INNER, DOUBLE_OUTER]
        : Math.hypot(spot.x, spot.y) < TREBLE_INNER
          ? [OUTER_BULL_RADIUS, TREBLE_INNER]
          : [TREBLE_OUTER, DOUBLE_INNER];
  return [inner + DOT_EDGE, outer - DOT_EDGE];
}

/** How far off the centre line, in degrees, a dot centre at `radius` clears the segment edge. */
function maxOffset(radius: number): number {
  return SEGMENT_ANGLE / 2 - (Math.asin(DOT_EDGE / radius) * 180) / Math.PI;
}

/** A point's distance from the centre and its angle off the centre line at `centre`. */
function polarOf({ x, y }: Point, centre: number): { radius: number; offset: number } {
  // 0° points up (negative y), angles grow clockwise, as on the board.
  const angle = (Math.atan2(x, -y) * 180) / Math.PI;
  return { radius: Math.hypot(x, y), offset: ((((angle - centre) % 360) + 540) % 360) - 180 };
}

/**
 * A dot of a treble or double. The ring leaves a dot centre only 3.4 mm of room across it,
 * so the radius is drawn evenly across that room and only the offset along the ring follows
 * a Gaussian around the spot. An offset past the segment edge is drawn again from the next
 * seed; after `MAX_DRAWS` the dot takes the spot's offset.
 */
function ringDot(seed: string, spot: Point, centre: number, [low, high]: [number, number]): Point {
  const [, across] = uniforms(seed);
  const radius = low + (high - low) * across;
  const limit = maxOffset(radius);
  const spotOffset = polarOf(spot, centre).offset;
  for (let draw = 0; draw < MAX_DRAWS; draw += 1) {
    // Box-Muller: the uniforms u1 and u2 give one normal offset along the ring.
    const [u1, u2] = uniforms(`${seed}:${draw}`);
    const along = SPREAD * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const offset = spotOffset + (along / radius) * (180 / Math.PI);
    if (Math.abs(offset) <= limit) {
      return pointAt(radius, centre + offset);
    }
  }
  return pointAt(radius, centre + spotOffset);
}

/**
 * A dot of a single: a Gaussian draw around the spot. A draw that leaves the single field
 * is drawn again from the next seed; after `MAX_DRAWS` the dot sits at the spot's offset,
 * at an even share of the radii where that offset clears the segment edge.
 */
function singleDot(
  seed: string,
  spot: Point,
  centre: number,
  [low, high]: [number, number],
): Point {
  for (let draw = 0; draw < MAX_DRAWS; draw += 1) {
    // Box-Muller: the uniforms u1 and u2 give a normal distance and a uniform direction.
    const [u1, u2] = uniforms(`${seed}:${draw}`);
    const distance = SPREAD * Math.sqrt(-2 * Math.log(u1));
    const direction = 2 * Math.PI * u2;
    const point = {
      x: spot.x + distance * Math.cos(direction),
      y: spot.y + distance * Math.sin(direction),
    };
    const { radius, offset } = polarOf(point, centre);
    if (radius >= low && radius <= high && Math.abs(offset) <= maxOffset(radius)) {
      return point;
    }
  }
  const spotOffset = polarOf(spot, centre).offset;
  const clear = DOT_EDGE / Math.sin(((SEGMENT_ANGLE / 2 - Math.abs(spotOffset)) * Math.PI) / 180);
  const inner = Math.max(low, clear);
  const [, across] = uniforms(seed);
  return pointAt(inner + (high - inner) * across, centre + spotOffset);
}

/** A dot of `S1` to `T20`, clustered around the board field's spot. */
function numberFieldDot(field: NumberField, index: number): Point {
  const spot = boardFieldSpot(field);
  const radii = dotRadii(field, spot);
  const centre = segmentCentre(field);
  const seed = `${field}:${index}`;
  return field.startsWith("S")
    ? singleDot(seed, spot, centre, radii)
    : ringDot(seed, spot, centre, radii);
}

/** A dot of Bull or Bullseye, spread evenly over its ring, the painted dot inside it. */
function centreDot(field: "BULL" | "BULLSEYE", index: number): Point {
  const [area, direction] = uniforms(`${field}:${index}`);
  const [inner, outer] =
    field === "BULLSEYE"
      ? [0, BULL_RADIUS - DOT_EDGE]
      : [BULL_RADIUS + DOT_EDGE, OUTER_BULL_RADIUS - DOT_EDGE];
  const radius = Math.sqrt(inner ** 2 + (outer ** 2 - inner ** 2) * area);
  return pointAt(radius, 360 * direction);
}

/**
 * One dot per hit, scattered inside its board field as if thrown; past 600 hits each board
 * field keeps its share of 600 dots. Dot `index` of a board field always lands on the same
 * spot, so more hits add dots and never move the ones already drawn.
 */
export function toHitDots(hitDistribution: PlayerProfile["hitDistribution"]): HitDot[] {
  const counts = dotCounts(hitDistribution);
  return hitDistribution.flatMap(({ field }, order) =>
    Array.from({ length: counts[order] ?? 0 }, (_, index) => ({
      field,
      index,
      ...(field === "BULL" || field === "BULLSEYE"
        ? centreDot(field, index)
        : numberFieldDot(field, index)),
    })),
  );
}
