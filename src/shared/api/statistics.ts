import * as v from "valibot";
import { apiClient } from "./client";
import { integerSchema } from "./schemas";
import type { PlayerDataProps, GameDataProps } from "@/types";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Contract `PlayerStatsResponseDto`. */
const playerStatsResponseSchema = v.object({
  limit: integerSchema,
  offset: integerSchema,
  total: integerSchema,
  items: v.array(
    v.object({
      playerId: integerSchema,
      name: v.string(),
      gamesPlayed: integerSchema,
      scoreAverage: v.number(),
    }),
  ),
});

/** Contract `GameOverviewResponseDto`. */
const gamesOverviewResponseSchema = v.object({
  limit: integerSchema,
  offset: integerSchema,
  total: integerSchema,
  items: v.array(
    v.object({
      id: integerSchema,
      date: v.optional(v.nullable(v.string())),
      finishedAt: v.optional(v.nullable(v.string())),
      playersCount: integerSchema,
      winnerName: v.optional(v.nullable(v.string())),
      winnerId: v.optional(v.nullable(integerSchema)),
      winnerRounds: integerSchema,
    }),
  ),
});

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Fetches aggregated player statistics with pagination and sorting.
 */
export async function getPlayerStats(
  limit: number = 10,
  offset: number = 0,
  sort?: string,
  signal?: AbortSignal,
): Promise<PlayerDataProps> {
  const query = {
    limit,
    offset,
    ...(sort ? { sort } : {}),
  };

  const stats = await apiClient.get("/players/stats", {
    query,
    signal,
    validate: playerStatsResponseSchema,
  });

  return {
    items: stats.items.map((item) => ({
      id: item.playerId,
      playerId: item.playerId,
      name: item.name,
      gamesPlayed: item.gamesPlayed,
      scoreAverage: item.scoreAverage,
    })),
    total: stats.total,
  };
}

/**
 * Fetches games overview with pagination and sorting.
 */
export async function getGamesOverview(
  limit: number = 9,
  offset: number = 0,
  signal?: AbortSignal,
): Promise<GameDataProps> {
  const overview = await apiClient.get("/games/overview", {
    query: { limit, offset },
    signal,
    validate: gamesOverviewResponseSchema,
  });

  return {
    items: overview.items.map((item) => ({
      id: item.id,
      winnerRounds: item.winnerRounds,
      winnerName: item.winnerName ?? null,
      playersCount: item.playersCount,
      date: item.date ?? item.finishedAt ?? null,
    })),
    total: overview.total,
  };
}
