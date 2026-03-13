import { apiClient } from "./client";
import { ApiError } from "./errors";
import type { PlayerDataProps, GameDataProps } from "@/types";
import { isFiniteNumber, isRecord } from "@/shared/lib/guards";

type NormalizedPaginatedResponse<TItem> = {
  items: TItem[];
  total: number;
};

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function parseFiniteNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalFiniteNumber(value: unknown): number | undefined | null {
  if (value === undefined || value === null) {
    return undefined;
  }

  return parseFiniteNumber(value);
}

function parseString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseNullableString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string") {
    return value;
  }

  return undefined;
}

function parseAliasedString(data: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    if (!(key in data) || data[key] === undefined || data[key] === null) {
      continue;
    }

    return parseString(data[key]);
  }

  return null;
}

function parseAliasedNullableString(
  data: Record<string, unknown>,
  keys: readonly string[],
): string | null | undefined {
  for (const key of keys) {
    if (!(key in data)) {
      continue;
    }

    return parseNullableString(data[key]);
  }

  return undefined;
}

function parseAliasedFiniteNumber(
  data: Record<string, unknown>,
  keys: readonly string[],
): number | null {
  for (const key of keys) {
    if (!(key in data) || data[key] === undefined || data[key] === null) {
      continue;
    }

    return parseFiniteNumber(data[key]);
  }

  return null;
}

function parseAliasedOptionalFiniteNumber(
  data: Record<string, unknown>,
  keys: readonly string[],
): number | undefined | null {
  for (const key of keys) {
    if (!(key in data) || data[key] === undefined || data[key] === null) {
      continue;
    }

    return parseFiniteNumber(data[key]);
  }

  return undefined;
}

function normalizePlayerStatsItem(data: unknown): {
  id: number;
  name: string;
  playerId: number;
  gamesPlayed?: number;
  scoreAverage?: number;
} | null {
  if (!isRecord(data)) {
    return null;
  }

  const id = parseAliasedFiniteNumber(data, ["id", "playerId"]);
  const playerId = parseAliasedFiniteNumber(data, ["playerId", "id"]);
  const name = parseAliasedString(data, ["name", "username"]);
  const gamesPlayed = parseOptionalFiniteNumber(data.gamesPlayed);
  const scoreAverage = parseAliasedOptionalFiniteNumber(data, [
    "scoreAverage",
    "average",
    "roundAverage",
  ]);

  if (
    id === null ||
    playerId === null ||
    name === null ||
    gamesPlayed === null ||
    scoreAverage === null
  ) {
    return null;
  }

  return {
    id,
    name,
    playerId,
    ...(gamesPlayed === undefined ? {} : { gamesPlayed }),
    ...(scoreAverage === undefined ? {} : { scoreAverage }),
  };
}

function isPlayerStatsItemResponse(data: unknown): data is {
  playerId: number;
  name: string;
  gamesPlayed: number;
  scoreAverage: number;
} {
  return (
    isRecord(data) &&
    isFiniteNumber(data.playerId) &&
    typeof data.name === "string" &&
    isFiniteNumber(data.gamesPlayed) &&
    isFiniteNumber(data.scoreAverage)
  );
}

function isPlayerStatsResponse(data: unknown): data is {
  limit: number;
  offset: number;
  total: number;
  items: Array<{
    playerId: number;
    name: string;
    gamesPlayed: number;
    scoreAverage: number;
  }>;
} {
  return (
    isRecord(data) &&
    isFiniteNumber(data.limit) &&
    isFiniteNumber(data.offset) &&
    isFiniteNumber(data.total) &&
    Array.isArray(data.items) &&
    data.items.every(isPlayerStatsItemResponse)
  );
}

function normalizeFinishedGameItem(data: unknown): {
  id: number;
  winnerRounds: number;
  winnerName: string | null;
  playersCount: number;
  date: string | null;
} | null {
  if (!isRecord(data)) {
    return null;
  }

  const id = parseFiniteNumber(data.id);
  const winnerRounds = parseFiniteNumber(data.winnerRounds);
  const winnerName = parseNullableString(data.winnerName);
  const playersCount = parseFiniteNumber(data.playersCount);
  const date = parseAliasedNullableString(data, ["date", "finishedAt"]);

  if (id === null || winnerRounds === null || playersCount === null) {
    return null;
  }

  if (winnerName === undefined || date === undefined) {
    return null;
  }

  return {
    id,
    winnerRounds,
    winnerName,
    playersCount,
    date,
  };
}

function normalizePlayerDataResponse(data: unknown): PlayerDataProps | null {
  if (Array.isArray(data)) {
    const items = data
      .map((item) => normalizePlayerStatsItem(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return items.length === data.length ? { items, total: items.length } : null;
  }

  if (!isRecord(data) || !Array.isArray(data.items)) {
    return null;
  }

  const total = parseFiniteNumber(data.total);
  if (total === null) {
    return null;
  }

  const items = data.items
    .map((item) => normalizePlayerStatsItem(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length !== data.items.length) {
    return null;
  }

  const normalized: NormalizedPaginatedResponse<(typeof items)[number]> = {
    items,
    total,
  };

  return normalized;
}

function normalizeGamesOverviewResponse(data: unknown): GameDataProps | null {
  if (Array.isArray(data)) {
    const items = data
      .map((item) => normalizeFinishedGameItem(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return items.length === data.length ? { items, total: items.length } : null;
  }

  if (!isRecord(data) || !Array.isArray(data.items)) {
    return null;
  }

  const total = parseFiniteNumber(data.total);
  if (total === null) {
    return null;
  }

  const items = data.items
    .map((item) => normalizeFinishedGameItem(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length !== data.items.length) {
    return null;
  }

  const normalized: NormalizedPaginatedResponse<(typeof items)[number]> = {
    items,
    total,
  };

  return normalized;
}

function isGamesOverviewItemResponse(data: unknown): data is {
  id: number;
  date: string | null;
  finishedAt: string | null;
  playersCount: number;
  winnerName: string | null;
  winnerId: number | null;
  winnerRounds: number;
} {
  return (
    isRecord(data) &&
    isFiniteNumber(data.id) &&
    (data.date === null || typeof data.date === "string") &&
    (data.finishedAt === null || typeof data.finishedAt === "string") &&
    isFiniteNumber(data.playersCount) &&
    (data.winnerName === null || typeof data.winnerName === "string") &&
    (data.winnerId === null || isFiniteNumber(data.winnerId)) &&
    isFiniteNumber(data.winnerRounds)
  );
}

function isGamesOverviewResponse(data: unknown): data is {
  limit: number;
  offset: number;
  total: number;
  items: Array<{
    id: number;
    date: string | null;
    finishedAt: string | null;
    playersCount: number;
    winnerName: string | null;
    winnerId: number | null;
    winnerRounds: number;
  }>;
} {
  return (
    isRecord(data) &&
    isFiniteNumber(data.limit) &&
    isFiniteNumber(data.offset) &&
    isFiniteNumber(data.total) &&
    Array.isArray(data.items) &&
    data.items.every(isGamesOverviewItemResponse)
  );
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
  sort?: string,
  signal?: AbortSignal,
): Promise<PlayerDataProps> {
  const query = {
    limit,
    offset,
    ...(sort ? { sort } : {}),
  };

  const data: unknown = await apiClient.get("/players/stats", {
    query,
    signal,
    validate: isPlayerStatsResponse,
  });
  const normalized = normalizePlayerDataResponse(data);
  if (normalized === null) {
    throw new ApiError("Unexpected response shape for player stats", { status: 200, data });
  }
  return normalized;
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
    validate: isGamesOverviewResponse,
  });
  const normalized = normalizeGamesOverviewResponse(data);
  if (normalized === null) {
    throw new ApiError("Unexpected response shape for games overview", { status: 200, data });
  }
  return normalized;
}
