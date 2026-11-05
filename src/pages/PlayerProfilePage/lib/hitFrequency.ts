import type { PlayerProfile } from "@/lib/player/profile";

/** Five steps, from the most hit board fields (0) to the least hit ones (4). */
export type HitFrequency = 0 | 1 | 2 | 3 | 4;

export const HIT_FREQUENCY_LABELS: Record<HitFrequency, string> = {
  0: "Very high",
  1: "High",
  2: "Medium",
  3: "Low",
  4: "Very low",
};

type BoardField = PlayerProfile["hitDistribution"][number]["field"];

/** A board field of a number, `S1` to `T20`: every board field but the centre. */
export type NumberField = Exclude<BoardField, "BULL" | "BULLSEYE">;

export interface BoardHitFrequencies {
  /** Board field `S1` to `T20` to its step. */
  fields: Partial<Record<NumberField, HitFrequency>>;
  /** The centre spot, Bull and Bullseye together. */
  bull: HitFrequency;
}

function toHitFrequency(hits: number, maxHits: number): HitFrequency {
  const ratio = maxHits === 0 ? 0 : hits / maxHits;
  if (ratio >= 0.8) return 0;
  if (ratio >= 0.6) return 1;
  if (ratio >= 0.4) return 2;
  if (ratio >= 0.2) return 3;
  return 4;
}

/**
 * Each board spot's hit frequency, compared with the spot the player hits most: one scale
 * for every board field and the centre, which counts Bull and Bullseye together.
 */
export function toBoardHitFrequencies(
  hitDistribution: PlayerProfile["hitDistribution"],
): BoardHitFrequencies {
  let bullHits = 0;
  const fieldHits: [NumberField, number][] = [];
  for (const { field, hits } of hitDistribution) {
    if (field === "BULL" || field === "BULLSEYE") {
      bullHits += hits;
    } else {
      fieldHits.push([field, hits]);
    }
  }
  const maxHits = Math.max(bullHits, ...fieldHits.map(([, hits]) => hits));
  const fields: BoardHitFrequencies["fields"] = {};
  for (const [field, hits] of fieldHits) {
    fields[field] = toHitFrequency(hits, maxHits);
  }

  return { fields, bull: toHitFrequency(bullHits, maxHits) };
}
