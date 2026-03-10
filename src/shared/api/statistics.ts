import { apiClient } from "./client";
import { ApiError } from "./errors";
import type { PlayerDataProps, GameDataProps } from "@/types";

type NormalizedPaginatedResponse<TItem> = {
  items: TItem[];
  total: number;
};

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

function normalizePlayerStatsItem(data: unknown) {
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

function normalizeFinishedGameItem(data: unknown) {
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
  });
  const normalized = normalizeGamesOverviewResponse(data);
  if (normalized === null) {
    throw new ApiError("Unexpected response shape for games overview", { status: 200, data });
  }
  return normalized;
}
