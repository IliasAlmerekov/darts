import * as v from "valibot";
import { toCurrentGame, type CurrentGame } from "@/lib/player/currentGame";
import { API_BASE_URL, apiClient } from "./client";
import { integerSchema } from "./schemas";

const currentGameResponseSchema = v.object({
  gameId: v.nullable(integerSchema),
  status: v.nullable(v.picklist(["lobby", "started"])),
});

export type CurrentGameResponse = v.InferOutput<typeof currentGameResponseSchema>;

/** Contract `GameSeatResponseDto`: the game's status and whether the player holds a seat in it. */
const gameSeatResponseSchema = v.object({
  gameId: integerSchema,
  status: v.picklist(["lobby", "started", "finished", "aborted"]),
  seated: v.boolean(),
});

export type GameSeatResponse = v.InferOutput<typeof gameSeatResponseSchema>;

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

/** A board field: the single, double or triple of a number, BULL or BULLSEYE. */
const boardFieldSchema = v.picklist([
  "S1",
  "D1",
  "T1",
  "S2",
  "D2",
  "T2",
  "S3",
  "D3",
  "T3",
  "S4",
  "D4",
  "T4",
  "S5",
  "D5",
  "T5",
  "S6",
  "D6",
  "T6",
  "S7",
  "D7",
  "T7",
  "S8",
  "D8",
  "T8",
  "S9",
  "D9",
  "T9",
  "S10",
  "D10",
  "T10",
  "S11",
  "D11",
  "T11",
  "S12",
  "D12",
  "T12",
  "S13",
  "D13",
  "T13",
  "S14",
  "D14",
  "T14",
  "S15",
  "D15",
  "T15",
  "S16",
  "D16",
  "T16",
  "S17",
  "D17",
  "T17",
  "S18",
  "D18",
  "T18",
  "S19",
  "D19",
  "T19",
  "S20",
  "D20",
  "T20",
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

/** Contract rates and shares: 0 to 100 with one decimal. */
const percentSchema = v.pipe(v.number(), v.minValue(0), v.maxValue(100));

/** Contract `PlayerProfileFieldHitsDto` list: one entry per board field, `S1` to `BULLSEYE`. */
const hitDistributionSchema = v.pipe(
  v.array(v.object({ field: boardFieldSchema, hits: integerSchema })),
  v.length(62),
);

/** Contract `PlayerProfileStatsDto`. */
const playerProfileStatsSchema = v.object({
  gamesPlayed: integerSchema,
  scoreAverage: v.optional(v.nullable(v.number())),
  wins: integerSchema,
  winRate: v.optional(v.nullable(percentSchema)),
  checkoutRate: v.optional(v.nullable(percentSchema)),
  checkoutHits: integerSchema,
  checkoutAttempts: integerSchema,
  hitDistribution: hitDistributionSchema,
  /** Contract `PlayerProfileHitDistributionByOutRuleDto`: the hits of each out rule's games. */
  hitDistributionByOutRule: v.object({
    singleout: hitDistributionSchema,
    doubleout: hitDistributionSchema,
    tripleout: hitDistributionSchema,
  }),
  /** Contract `PlayerProfileMostHitSegmentDto`. */
  mostHitSegment: v.optional(
    v.nullable(v.object({ segment: segmentSchema, hits: integerSchema, share: percentSchema })),
  ),
  /** Contract `PlayerProfileDoubleDto`: at most 3, Double-out games only. */
  favoriteDoubles: v.pipe(
    v.array(
      v.object({
        double: doubleSchema,
        hits: integerSchema,
        attempts: integerSchema,
        hitRate: percentSchema,
      }),
    ),
    v.maxLength(3),
  ),
  /** Contract `PlayerProfileFinishDto`: `throws` holds the darts in order, such as `D16`. */
  highestFinish: v.optional(
    v.nullable(
      v.object({
        score: integerSchema,
        darts: v.pipe(integerSchema, v.minValue(1), v.maxValue(3)),
        throws: v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(3)),
      }),
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
  registeredAt: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp()))),
});

export type PlayerProfileResponse = v.InferOutput<typeof playerProfileResponseSchema>;
export type PlayerProfileGame = PlayerProfileResponse["recentGames"][number];

/**
 * Contract `PlayerPublicProfileResponseDto`: another registered player's name and the same
 * stats as the own profile. A player without games gets empty stats.
 */
const playerPublicProfileResponseSchema = v.object({
  playerId: integerSchema,
  displayName: v.string(),
  stats: playerProfileStatsSchema,
});

export type PlayerPublicProfileResponse = v.InferOutput<typeof playerPublicProfileResponseSchema>;

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const CURRENT_GAME_ENDPOINT = "/player/current-game";
const PROFILE_ENDPOINT = "/player/profile";
const PUBLIC_PROFILE_ENDPOINT = (playerId: number) => `/player/${playerId}/profile`;
const GAME_SEAT_ENDPOINT = (gameId: number) => `/player/games/${gameId}/seat`;
const AVATAR_ENDPOINT = (playerId: number) => `/player/${playerId}/avatar`;

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

/**
 * The URL of the player's avatar picture, for an `<img src>`. The browser loads it with the
 * session cookie; it never goes through `apiClient`, so no schema checks the bytes.
 */
export function playerAvatarUrl(playerId: number): string {
  return `${API_BASE_URL}${AVATAR_ENDPOINT(playerId)}`;
}

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

/**
 * Reads the Public profile of another registered player. An unknown id, a guest and the
 * admin account answer 404 `PLAYER_NOT_FOUND`.
 */
export async function getPlayerPublicProfile(
  playerId: number,
  signal?: AbortSignal,
): Promise<PlayerPublicProfileResponse> {
  return apiClient.get(PUBLIC_PROFILE_ENDPOINT(playerId), {
    ...(signal ? { signal } : {}),
    validate: playerPublicProfileResponseSchema,
  });
}

/**
 * Reads a game's status and whether the logged-in player still holds a seat in it.
 */
export async function getPlayerGameSeat(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameSeatResponse> {
  return apiClient.get(GAME_SEAT_ENDPOINT(gameId), {
    ...(signal ? { signal } : {}),
    validate: gameSeatResponseSchema,
  });
}
