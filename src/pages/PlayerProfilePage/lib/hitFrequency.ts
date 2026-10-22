import type { PlayerProfile } from "@/lib/player/profile";

/** Five steps, from the most hit segments (0) to the least hit ones (4). */
export type HitFrequency = 0 | 1 | 2 | 3 | 4;

export const HIT_FREQUENCY_LABELS: Record<HitFrequency, string> = {
  0: "Very high",
  1: "High",
  2: "Medium",
  3: "Low",
  4: "Very low",
};

export interface BoardHitFrequencies {
  /** Segment `1` to `20` to its step. */
  segments: Partial<Record<string, HitFrequency>>;
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

/** Each board spot's hit frequency, compared with the spot the player hits most. */
export function toBoardHitFrequencies(
  hitDistribution: PlayerProfile["hitDistribution"],
): BoardHitFrequencies {
  let bullHits = 0;
  const segmentHits: [string, number][] = [];
  for (const { segment, hits } of hitDistribution) {
    if (segment === "BULL" || segment === "BULLSEYE") {
      bullHits += hits;
    } else {
      segmentHits.push([segment, hits]);
    }
  }
  const maxHits = Math.max(bullHits, ...segmentHits.map(([, hits]) => hits));

  return {
    segments: Object.fromEntries(
      segmentHits.map(([segment, hits]) => [segment, toHitFrequency(hits, maxHits)]),
    ),
    bull: toHitFrequency(bullHits, maxHits),
  };
}
