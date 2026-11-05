import type { PlayerProfile } from "@/lib/player/profile";
import {
  boardFieldSpot,
  BULL_RADIUS,
  DOUBLE_INNER,
  DOUBLE_OUTER,
  hash,
  OUTER_BULL_RADIUS,
  SEGMENT_ANGLE,
  segmentCentre,
  TREBLE_INNER,
  TREBLE_OUTER,
} from "./boardFieldSpot";
import type { BoardField, NumberField } from "./hitFrequency";

/** A hit dot's radius in board millimetres: 2 mm of travel each way in an 8 mm ring. */
export const HIT_DOT_RADIUS = 2;
/** The most dots a board draws before each board field's share shrinks. */
const DOT_BUDGET = 600;
/** The spread of a number field's dots around its spot, in millimetres per axis. */
const SPREAD = 6;
/** Draws per dot before a dot that keeps leaving its board field is pulled back in. */
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

/** Two shares from the 16-bit halves of a hash: the first in (0, 1], the second in [0, 1). */
function shares(seed: string): [number, number] {
  const value = hash(seed);
  return [((value & 0xffff) + 1) / 0x10000, (value >>> 16) / 0x10000];
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
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
    return { order, hits: count, count: Math.floor(quota), rest: quota - Math.floor(quota) };
  });
  const left = DOT_BUDGET - parts.reduce((sum, part) => sum + part.count, 0);
  const byRest = [...parts].sort((a, b) => b.rest - a.rest || a.order - b.order);
  for (const part of byRest.slice(0, left)) {
    part.count += 1;
  }
  return parts.map((part) => (part.hits > 0 ? Math.max(1, part.count) : 0));
}

/** The radii a number field's dot centres may take, the dot radius inside its ring. */
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
  return [inner + HIT_DOT_RADIUS, outer - HIT_DOT_RADIUS];
}

/** How far off the centre line, in degrees, a dot centre at `radius` clears the segment edge. */
function maxOffset(radius: number): number {
  return SEGMENT_ANGLE / 2 - (Math.asin(HIT_DOT_RADIUS / radius) * 180) / Math.PI;
}

/**
 * A dot of `S1` to `T20`: a Gaussian draw around the board field's spot. A draw that
 * leaves the board field is drawn again from the next seed; after `MAX_DRAWS` the last
 * draw is clamped to the field's ring and segment edges.
 */
function numberFieldDot(field: NumberField, index: number): Point {
  const spot = boardFieldSpot(field);
  const [low, high] = dotRadii(field, spot);
  const centre = segmentCentre(field);
  let radius = 0;
  let offset = 0;
  for (let draw = 0; draw < MAX_DRAWS; draw += 1) {
    const [first, second] = shares(`${field}:${index}:${draw}`);
    // Box-Muller: a normal distance and a uniform direction.
    const distance = SPREAD * Math.sqrt(-2 * Math.log(first));
    const direction = 2 * Math.PI * second;
    const x = spot.x + distance * Math.cos(direction);
    const y = spot.y + distance * Math.sin(direction);
    radius = Math.hypot(x, y);
    // 0° points up (negative y), angles grow clockwise, as on the board.
    const angle = (Math.atan2(x, -y) * 180) / Math.PI;
    offset = ((((angle - centre) % 360) + 540) % 360) - 180;
    if (radius >= low && radius <= high && Math.abs(offset) <= maxOffset(radius)) {
      return { x, y };
    }
  }
  radius = clamp(radius, low, high);
  const limit = maxOffset(radius);
  const radians = ((centre + clamp(offset, -limit, limit) - 90) * Math.PI) / 180;
  return { x: radius * Math.cos(radians), y: radius * Math.sin(radians) };
}

/** A dot of Bull or Bullseye, spread evenly over its ring, the dot radius inside it. */
function centreDot(field: "BULL" | "BULLSEYE", index: number): Point {
  const [area, direction] = shares(`${field}:${index}`);
  const [inner, outer] =
    field === "BULLSEYE"
      ? [0, BULL_RADIUS - HIT_DOT_RADIUS]
      : [BULL_RADIUS + HIT_DOT_RADIUS, OUTER_BULL_RADIUS - HIT_DOT_RADIUS];
  const radius = Math.sqrt(inner ** 2 + (outer ** 2 - inner ** 2) * area);
  const radians = 2 * Math.PI * direction;
  return { x: radius * Math.cos(radians), y: radius * Math.sin(radians) };
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
