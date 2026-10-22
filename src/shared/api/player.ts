import * as v from "valibot";
import { toCurrentGame, type CurrentGame } from "@/lib/player/currentGame";
import { apiClient } from "./client";
import { integerSchema } from "./schemas";

const currentGameResponseSchema = v.object({
  gameId: v.nullable(integerSchema),
  status: v.nullable(v.picklist(["lobby", "started"])),
});

export type CurrentGameResponse = v.InferOutput<typeof currentGameResponseSchema>;

/** Contract `PlayerProfileParticipantDto`. `playerId` is null for a Guest. */
const playerProfileParticipantSchema = v.object({
  playerId: v.optional(v.nullable(integerSchema)),
  displayName: v.optional(v.nullable(v.string())),
  placement: v.optional(v.nullable(integerSchema)),
  isSelf: v.boolean(),
});

/** Contract `PlayerProfileGameDto`. `finishedAt` is an ATOM date, null for older games. */
const playerProfileGameSchema = v.object({
  gameId: integerSchema,
  finishedAt: v.optional(v.nullable(v.string())),
  placement: v.optional(v.nullable(integerSchema)),
  roundAverage: v.number(),
  participantsCount: integerSchema,
  participants: v.array(playerProfileParticipantSchema),
});

const segmentSchema = v.picklist([
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "BULL",
  "BULLSEYE",
]);

const doubleSchema = v.picklist([
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "D7",
  "D8",
  "D9",
  "D10",
  "D11",
  "D12",
  "D13",
  "D14",
  "D15",
  "D16",
  "D17",
  "D18",
  "D19",
  "D20",
  "BULLSEYE",
]);

/** Contract `PlayerProfileStatsDto`. Rates and shares run from 0 to 100. */
const playerProfileStatsSchema = v.object({
  gamesPlayed: integerSchema,
  scoreAverage: v.optional(v.nullable(v.number())),
  wins: integerSchema,
  winRate: v.optional(v.nullable(v.number())),
  checkoutRate: v.optional(v.nullable(v.number())),
  checkoutHits: integerSchema,
  checkoutAttempts: integerSchema,
  /** Contract `PlayerProfileSegmentHitsDto`: one entry per segment, `1` to `BULLSEYE`. */
  hitDistribution: v.array(v.object({ segment: segmentSchema, hits: integerSchema })),
  /** Contract `PlayerProfileMostHitSegmentDto`. */
  mostHitSegment: v.optional(
    v.nullable(v.object({ segment: segmentSchema, hits: integerSchema, share: v.number() })),
  ),
  /** Contract `PlayerProfileDoubleDto`: at most 3, Double-out games only. */
  favoriteDoubles: v.array(
    v.object({
      double: doubleSchema,
      hits: integerSchema,
      attempts: integerSchema,
      hitRate: v.number(),
    }),
  ),
  /** Contract `PlayerProfileFinishDto`: `throws` holds the 1 to 3 darts, such as `D16`. */
  highestFinish: v.optional(
    v.nullable(
      v.object({ score: integerSchema, darts: integerSchema, throws: v.array(v.string()) }),
    ),
  ),
});

/**
 * Contract `PlayerProfileResponseDto`: own stats and the 10 newest finished games.
 * `registeredAt` is an ATOM date, null for a player registered before the field existed.
 */
const playerProfileResponseSchema = v.object({
  stats: playerProfileStatsSchema,
  recentGames: v.array(playerProfileGameSchema),
  registeredAt: v.optional(v.nullable(v.string())),
});

export type PlayerProfileResponse = v.InferOutput<typeof playerProfileResponseSchema>;
export type PlayerProfileGame = PlayerProfileResponse["recentGames"][number];

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const CURRENT_GAME_ENDPOINT = "/player/current-game";
const PROFILE_ENDPOINT = "/player/profile";

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

/**
 * Reads the Lobby or Started game the logged-in player currently belongs to.
 */
export async function getCurrentGame(signal?: AbortSignal): Promise<CurrentGame> {
  const response = await apiClient.get(CURRENT_GAME_ENDPOINT, {
    ...(signal ? { signal } : {}),
    validate: currentGameResponseSchema,
  });
  return toCurrentGame(response);
}

/**
 * Reads the logged-in player's own statistics and recent finished games, newest first.
 */
export async function getPlayerProfile(signal?: AbortSignal): Promise<PlayerProfileResponse> {
  return apiClient.get(PROFILE_ENDPOINT, {
    ...(signal ? { signal } : {}),
    validate: playerProfileResponseSchema,
  });
}
