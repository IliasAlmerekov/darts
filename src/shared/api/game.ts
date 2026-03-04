import { apiClient, API_BASE_URL } from "@/lib/api";
import { ApiError, ForbiddenError, NetworkError, UnauthorizedError } from "@/lib/api/errors";
import type { GameThrowsResponse, ThrowAckResponse, ThrowRequest, StartGameRequest } from "@/types";
import type { FinishedPlayerResponse, RematchResponse, CreateGameSettingsPayload } from "@/types";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const GAME_ENDPOINT = (id: number) => `/game/${id}`;
const START_GAME_ENDPOINT = (id: number) => `/game/${id}/start`;
const FINISH_GAME_ENDPOINT = (id: number) => `/game/${id}/finish`;
const FINISHED_GAME_ENDPOINT = (id: number) => `/game/${id}/finished`;
const REOPEN_GAME_ENDPOINT = (id: number) => `/game/${id}/reopen`;
const ABORT_GAME_ENDPOINT = (id: number) => `/game/${id}/abort`;
const REMATCH_ENDPOINT = (id: number) => `/room/${id}/rematch`;
const CREATE_INVITE_ENDPOINT = (id: number) => `/invite/create/${id}`;
const CREATE_GAME_SETTINGS_ENDPOINT = "/game/settings";
const GAME_SETTINGS_ENDPOINT = (id: number) => `/game/${id}/settings`;
const RECORD_THROW_ENDPOINT = (id: number) => `/game/${id}/throw/delta`;
const UNDO_THROW_ENDPOINT = (id: number) => `/game/${id}/throw`;

// ---------------------------------------------------------------------------
// ETag-based conditional game state fetching
// ---------------------------------------------------------------------------

const gameStateVersionById = new Map<number, string>();

type ParsedResponse = unknown;

function buildConditionalGameUrl(gameId: number, stateVersion: string | null): string {
  const endpoint = GAME_ENDPOINT(gameId);
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
  return apiClient.get(GAME_ENDPOINT(gameId));
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

/**
 * Saves known server state version for subsequent conditional game requests.
 */
export function setGameStateVersion(gameId: number, stateVersion: string): void {
  if (!stateVersion) {
    return;
  }

  gameStateVersionById.set(gameId, stateVersion);
}

// ---------------------------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------------------------

/**
 * Starts a game with the provided settings.
 */
export async function startGame(gameId: number, config: StartGameRequest): Promise<void> {
  await apiClient.post(START_GAME_ENDPOINT(gameId), {
    status: config.status,
    round: config.round,
    startscore: config.startScore,
    doubleout: config.doubleOut,
    tripleout: config.tripleOut,
  });
}

/**
 * Marks a game as finished and returns final standings.
 */
export async function finishGame(gameId: number): Promise<FinishedPlayerResponse[]> {
  return apiClient.post(FINISH_GAME_ENDPOINT(gameId));
}

/**
 * Fetches final standings for a finished game.
 */
export async function getFinishedGame(gameId: number): Promise<FinishedPlayerResponse[]> {
  return apiClient.get(FINISHED_GAME_ENDPOINT(gameId));
}

/**
 * Reopens a finished game and returns the updated game state.
 */
export async function reopenGame(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.patch<GameThrowsResponse>(REOPEN_GAME_ENDPOINT(gameId));
}

/**
 * Aborts the specified game on the server.
 */
export async function abortGame(gameId: number): Promise<{ message: string }> {
  return apiClient.patch(ABORT_GAME_ENDPOINT(gameId));
}

/**
 * Creates a rematch and returns invitation details for the new game.
 */
export async function createRematch(previousGameId: number): Promise<RematchResponse> {
  const rematch = await apiClient.post<RematchResponse | { gameId: number; invitationLink?: string; success?: boolean }>(
    REMATCH_ENDPOINT(previousGameId),
  );

  if ("invitationLink" in rematch && rematch.invitationLink) {
    return {
      success: "success" in rematch ? !!rematch.success : true,
      gameId: rematch.gameId,
      invitationLink: rematch.invitationLink,
    };
  }

  const invite = await apiClient.post<{ gameId: number; invitationLink: string }>(
    CREATE_INVITE_ENDPOINT(rematch.gameId),
  );
  return {
    success: "success" in rematch ? !!rematch.success : true,
    gameId: invite.gameId,
    invitationLink: invite.invitationLink,
  };
}

// ---------------------------------------------------------------------------
// Game settings
// ---------------------------------------------------------------------------

type UpdateGameSettingsPayload = Partial<{
  doubleOut: boolean;
  tripleOut: boolean;
}>;

/**
 * Creates game settings for a new game.
 */
export async function createGameSettings(
  payload: CreateGameSettingsPayload,
): Promise<GameThrowsResponse> {
  return apiClient.post(CREATE_GAME_SETTINGS_ENDPOINT, payload);
}

/**
 * Updates settings for an existing game.
 */
export async function updateGameSettings(
  gameId: number,
  payload: UpdateGameSettingsPayload,
): Promise<GameThrowsResponse> {
  return apiClient.patch(GAME_SETTINGS_ENDPOINT(gameId), payload);
}

/**
 * Creates or updates game settings depending on whether a game id is provided.
 */
export async function saveGameSettings(
  payload: CreateGameSettingsPayload,
  gameId?: number | null,
): Promise<GameThrowsResponse> {
  if (gameId) {
    return updateGameSettings(gameId, payload);
  }
  return createGameSettings(payload);
}

// ---------------------------------------------------------------------------
// Throws
// ---------------------------------------------------------------------------

/**
 * Records a throw and returns compact server acknowledgement with scoreboard delta.
 */
export async function recordThrow(
  gameId: number,
  payload: ThrowRequest,
): Promise<ThrowAckResponse> {
  return apiClient.post<ThrowAckResponse>(RECORD_THROW_ENDPOINT(gameId), payload);
}

/**
 * Undoes the last throw and returns the complete updated game state.
 */
export async function undoLastThrow(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.delete<GameThrowsResponse>(UNDO_THROW_ENDPOINT(gameId));
}
