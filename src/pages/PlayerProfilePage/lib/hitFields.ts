import type { BOARD_ORDER } from "./boardFieldSpot";
import type { BoardField, HitDistribution } from "./hitFrequency";

/**
 * The most hits a board draws as dots. Past it the dots bury the board, so each board field
 * is filled with blue instead, as strong as its hit frequency step.
 */
const HIT_DOT_LIMIT = 150;
const TOP_FIELD_COUNT = 5;

export interface FieldHits {
  field: BoardField;
  /** `S20`, `T20`, `D20`, `Bull` or `Bullseye`. */
  label: string;
  hits: number;
}

/** A number segment of the board, or the centre with Bull and Bullseye. */
export type BoardSector = (typeof BOARD_ORDER)[number] | "BULL";

export interface SectorHits {
  /** `Sector 20`, or `Bull` for the centre. */
  name: string;
  hits: number;
  /** Single, double and triple of a number; Bull and Bullseye of the centre. */
  rows: { label: string; hits: number }[];
}

function fieldLabel(field: BoardField): string {
  return field === "BULL" ? "Bull" : field === "BULLSEYE" ? "Bullseye" : field;
}

function totalHits(hitDistribution: HitDistribution): number {
  return hitDistribution.reduce((sum, { hits }) => sum + hits, 0);
}

/** Whether the board shows one dot per hit, rather than filled board fields. */
export function drawsHitDots(hitDistribution: HitDistribution): boolean {
  return totalHits(hitDistribution) <= HIT_DOT_LIMIT;
}

/** The five most hit board fields, most hits first; a tie keeps board field order. */
export function topHitFields(hitDistribution: HitDistribution): FieldHits[] {
  return hitDistribution
    .filter(({ hits }) => hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, TOP_FIELD_COUNT)
    .map(({ field, hits }) => ({ field, label: fieldLabel(field), hits }));
}

/** A sector's hits in all and per board field, for the sector card. */
export function sectorHits(hitDistribution: HitDistribution, sector: BoardSector): SectorHits {
  const hitsOf = (field: BoardField): number =>
    hitDistribution.find((entry) => entry.field === field)?.hits ?? 0;
  const rows =
    sector === "BULL"
      ? [
          { label: "Bull", hits: hitsOf("BULL") },
          { label: "Bullseye", hits: hitsOf("BULLSEYE") },
        ]
      : [
          { label: `Single ${sector}`, hits: hitsOf(`S${sector}`) },
          { label: `Double ${sector}`, hits: hitsOf(`D${sector}`) },
          { label: `Triple ${sector}`, hits: hitsOf(`T${sector}`) },
        ];

  return {
    name: sector === "BULL" ? "Bull" : `Sector ${sector}`,
    hits: rows.reduce((sum, row) => sum + row.hits, 0),
    rows,
  };
}
