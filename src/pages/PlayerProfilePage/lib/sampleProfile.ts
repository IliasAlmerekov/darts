// Sample values for the Player profile blocks the API does not carry yet: Won and the
// checkout figures and throw statistics come with darts-backend#128, Member since with
// darts-backend#127. Each value can move to API data on its own; the layout reads only this
// module, and every block that shows one of these values carries a "Sample data" badge.

/** Five steps, from the most hit segments (0) to the least hit ones (4). */
export type HitFrequency = 0 | 1 | 2 | 3 | 4;

export const HIT_FREQUENCY_LABELS: Record<HitFrequency, string> = {
  0: "Very high",
  1: "High",
  2: "Medium",
  3: "Low",
  4: "Very low",
};

/** Segment number to hit frequency. */
const SAMPLE_HIT_SEGMENTS: Record<number, HitFrequency> = {
  20: 0,
  1: 1,
  18: 2,
  4: 3,
  13: 3,
  6: 2,
  10: 3,
  15: 4,
  2: 4,
  17: 3,
  3: 2,
  19: 1,
  7: 2,
  16: 1,
  8: 3,
  11: 4,
  14: 3,
  9: 4,
  12: 3,
  5: 1,
};

const SAMPLE_BULL: HitFrequency = 2;

export const SAMPLE_PROFILE = {
  subtitle: "Consistent finisher",
  memberSince: "Apr 2024",
  won: { games: 11, winRate: 61 },
  checkout: { rate: 38, checkouts: 21, attempts: 55 },
  hitDistribution: { segments: SAMPLE_HIT_SEGMENTS, bull: SAMPLE_BULL },
  favoriteDoubles: [
    { segment: "D20", hits: 9, attempts: 21 },
    { segment: "D16", hits: 6, attempts: 15 },
    { segment: "D8", hits: 3, attempts: 9 },
  ],
  highestFinish: { score: 120, darts: 3, throws: ["T20", "T20", "D20"] },
  mostHitSegment: { segment: "T20", share: 18, hint: "Your go-to target when you score." },
};
