import type { PlayerProfile } from "@/lib/player/profile";

/** Five steps, from the most hit board fields (0) to the least hit ones (4). */
export type HitFrequency = 0 | 1 | 2 | 3 | 4;

/** One view of the player's hits: the 62 board fields, `S1` to `BULLSEYE`, each with its hits. */
export type HitDistribution = PlayerProfile["hitDistributions"]["all"];

/** One of the 62 board fields, `S1` to `T20`, `BULL` and `BULLSEYE`. */
export type BoardField = HitDistribution[number]["field"];

/** A board field of a number, `S1` to `T20`: every board field but the centre. */
export type NumberField = Exclude<BoardField, "BULL" | "BULLSEYE">;

/** Each board field in the hit distribution, `S1` to `T20`, `BULL` and `BULLSEYE`, to its step. */
export type BoardHitFrequencies = Partial<Record<BoardField, HitFrequency>>;

function toHitFrequency(hits: number, maxHits: number): HitFrequency {
  const ratio = maxHits === 0 ? 0 : hits / maxHits;
  if (ratio >= 0.8) return 0;
  if (ratio >= 0.6) return 1;
  if (ratio >= 0.4) return 2;
  if (ratio >= 0.2) return 3;
  return 4;
}

/**
 * Each board field's hit frequency, compared with the board field the player hits most: one
 * scale for all 62 board fields, Bull and Bullseye included, each with its own step.
 */
export function toBoardHitFrequencies(hitDistribution: HitDistribution): BoardHitFrequencies {
  const maxHits = Math.max(0, ...hitDistribution.map(({ hits }) => hits));
  const frequencies: BoardHitFrequencies = {};
  for (const { field, hits } of hitDistribution) {
    frequencies[field] = toHitFrequency(hits, maxHits);
  }

  return frequencies;
}
