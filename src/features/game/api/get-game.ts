import { apiClient, API_BASE_URL } from "@/lib/api";
import { ApiError, ForbiddenError, NetworkError, UnauthorizedError } from "@/lib/api/errors";
import type { GameThrowsResponse } from "@/types";

const GET_GAME_ENDPOINT = (id: number) => `/game/${id}`;
const gameStateVersionById = new Map<number, string>();

type ParsedResponse = unknown;

function buildConditionalGameUrl(gameId: number, stateVersion: string | null): string {
  const endpoint = GET_GAME_ENDPOINT(gameId);
  if (!stateVersion) return `${API_BASE_URL}${endpoint}`;

  const encodedVersion = encodeURIComponent(stateVersion);
  return `${API_BASE_URL}${endpoint}?since=${encodedVersion}`;
}

async function parseResponseBody(response: Response): Promise<ParsedResponse> {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (isJson) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
}

function getNextStateVersion(response: Response): string | null {
  return response.headers.get("X-Game-State-Version") ?? response.headers.get("ETag");
}

/**
 * Fetches the current game state including throws and players.
 */
export async function getGameThrows(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.get(GET_GAME_ENDPOINT(gameId));
}

/**
 * Fetches game state conditionally and returns null if state has not changed.
 */
export async function getGameThrowsIfChanged(gameId: number): Promise<GameThrowsResponse | null> {
  const currentVersion = gameStateVersionById.get(gameId) ?? null;
  const requestUrl = buildConditionalGameUrl(gameId, currentVersion);

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(currentVersion ? { "If-None-Match": currentVersion } : {}),
      },
    });
  } catch (error) {
    throw new NetworkError("Network request failed", error);
  }

  if (response.status === 304) {
    return null;
  }

  const data = await parseResponseBody(response);

  if (response.status === 401) {
    window.location.href = "/";
    throw new UnauthorizedError("Unauthorized", data, response.url);
  }

  if (response.status === 403) {
    throw new ForbiddenError("Access denied", data, response.url);
  }

  if (!response.ok) {
    throw new ApiError("Request failed", {
      status: response.status,
      data,
      url: response.url,
    });
  }

  const nextVersion = getNextStateVersion(response);
  if (nextVersion) {
    gameStateVersionById.set(gameId, nextVersion);
  }

  return data as GameThrowsResponse;
}

/**
 * Clears cached game state versions for conditional requests.
 */
export function resetGameStateVersion(gameId?: number): void {
  if (typeof gameId === "number") {
    gameStateVersionById.delete(gameId);
    return;
  }

  gameStateVersionById.clear();
}
