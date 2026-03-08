import { apiClient } from "./client";
import { ApiError } from "./errors";
import type { PlayerDataProps, GameDataProps } from "@/types";

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null;
}

function isPaginatedResponse(data: unknown): data is { items: unknown[]; total: number } {
  return isRecord(data) && Array.isArray(data.items) && typeof data.total === "number";
}

function isPlayerDataResponse(data: unknown): data is PlayerDataProps {
  return isPaginatedResponse(data) || Array.isArray(data);
}

function isGameDataResponse(data: unknown): data is GameDataProps {
  return isPaginatedResponse(data) || Array.isArray(data);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Fetches aggregated player statistics with pagination and sorting.
 */
export async function getPlayerStats(
  limit: number = 10,
  offset: number = 0,
  sort: string = "average:desc",
  signal?: AbortSignal,
): Promise<PlayerDataProps> {
  const data: unknown = await apiClient.get("/players/stats", {
    query: { limit, offset, sort },
    signal,
  });
  if (!isPlayerDataResponse(data)) {
    throw new ApiError("Unexpected response shape for player stats", { status: 200, data });
  }
  return data;
}

/**
 * Fetches games overview with pagination and sorting.
 */
export async function getGamesOverview(
  limit: number = 9,
  offset: number = 0,
  signal?: AbortSignal,
): Promise<GameDataProps> {
  const data: unknown = await apiClient.get("/games/overview", {
    query: { limit, offset },
    signal,
  });
  if (!isGameDataResponse(data)) {
    throw new ApiError("Unexpected response shape for games overview", { status: 200, data });
  }
  return data;
}
