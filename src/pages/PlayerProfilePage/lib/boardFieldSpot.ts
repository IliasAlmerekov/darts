import type { NumberField } from "./hitFrequency";

// Clockwise from the top, as on a real board.
export const BOARD_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;
export const SEGMENT_ANGLE = 360 / BOARD_ORDER.length;
// Ring radii in millimetres of a regulation board.
export const BULL_RADIUS = 6.4;
export const OUTER_BULL_RADIUS = 16;
export const TREBLE_INNER = 99;
export const TREBLE_OUTER = 107;
export const DOUBLE_INNER = 162;
export const DOUBLE_OUTER = 170;

// A spot sits 3° to 4° off its segment's centre line, to either side.
const MIN_OFFSET = 3;
const MAX_OFFSET = 4;
// Single spots stay 4 mm inside the single field and the segment's angle: at 4° off the
// centre line that takes 46 mm from the centre to clear the segment edge.
const SPOT_MARGIN = 4;
const INNER_SINGLE = [48, TREBLE_INNER - SPOT_MARGIN] as const;
const OUTER_SINGLE = [TREBLE_OUTER + SPOT_MARGIN, DOUBLE_INNER - SPOT_MARGIN] as const;

/**
 * FNV-1a with the MurmurHash3 finalizer: a small, stable hash, so the same board field
 * always lands on the same spot. The finalizer spreads short strings like `S1` and `S2`
 * over all 32 bits.
 */
export function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return value >>> 0;
}

/** A share from 0 to 1 taken from 8 bits of the hash, starting at `shift`. */
function share(value: number, shift: number): number {
  return ((value >>> shift) & 0xff) / 0xff;
}

function between([low, high]: readonly [number, number], fraction: number): number {
  return low + (high - low) * fraction;
}

/**
 * A point `radius` millimetres from the centre and `degrees` clockwise from the top, in
 * board millimetres with y pointing down.
 */
export function pointAt(radius: number, degrees: number): { x: number; y: number } {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: radius * Math.cos(radians), y: radius * Math.sin(radians) };
}

/** The angle of a board field's segment centre line, in degrees clockwise from the top. */
export function segmentCentre(field: NumberField): number {
  const segment = field.slice(1);
  return BOARD_ORDER.findIndex((number) => String(number) === segment) * SEGMENT_ANGLE;
}

/**
 * Where a board field's heat spot sits, in board millimetres from the centre, with y
 * pointing down. Trebles and doubles sit on the middle of their ring, singles in the inner
 * or outer single field; every spot sits 3° to 4° off its segment's centre line. Same field
 * in, same position out.
 *
 * shortcut: the app has no real throw positions, so this spot is the centre of the board
 * field's glow and of its cluster of hit dots; replace it once the backend records where
 * each dart landed.
 */
export function boardFieldSpot(field: NumberField): { x: number; y: number } {
  const value = hash(field);
  const ring = field.charAt(0);
  const radius =
    ring === "T"
      ? (TREBLE_INNER + TREBLE_OUTER) / 2
      : ring === "D"
        ? (DOUBLE_INNER + DOUBLE_OUTER) / 2
        : between(value & 1 ? OUTER_SINGLE : INNER_SINGLE, share(value, 8));
  const side = value & 2 ? 1 : -1;
  const offset = side * between([MIN_OFFSET, MAX_OFFSET], share(value, 16));
  return pointAt(radius, segmentCentre(field) + offset);
}
