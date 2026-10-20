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

/** Contract `PlayerProfileResponseDto`: own stats and the 10 newest finished games. */
const playerProfileResponseSchema = v.object({
  stats: v.object({
    gamesPlayed: integerSchema,
    scoreAverage: v.optional(v.nullable(v.number())),
  }),
  recentGames: v.array(playerProfileGameSchema),
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
