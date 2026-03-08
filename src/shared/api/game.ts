import { apiClient } from "./client";
import { ApiError } from "./errors";
import type {
  GameStatus,
  GameThrowsResponse,
  ThrowAckResponse,
  ThrowRequest,
  StartGameRequest,
} from "@/types";
import type {
  FinishedPlayerResponse,
  RematchResponse,
  CreateGameSettingsPayload,
  GameSettingsResponse,
} from "@/types";

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

const GAME_STATUS_VALUES: readonly GameStatus[] = ["lobby", "started", "finished"];

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null;
}

function isGameStatus(value: unknown): value is GameStatus {
  return typeof value === "string" && GAME_STATUS_VALUES.includes(value as GameStatus);
}

function isGameThrowsResponse(data: unknown): data is GameThrowsResponse {
  if (!isRecord(data)) {
    return false;
  }

  return typeof data.id === "number" && Array.isArray(data.players) && isGameStatus(data.status);
}

function isFinishedPlayerResponseArray(data: unknown): data is FinishedPlayerResponse[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        isRecord(item) &&
        typeof item.playerId === "number" &&
        typeof item.username === "string" &&
        typeof item.position === "number",
    )
  );
}

function isThrowAckResponse(data: unknown): data is ThrowAckResponse {
  if (!isRecord(data)) {
    return false;
  }

  return (
    typeof data.success === "boolean" &&
    typeof data.gameId === "number" &&
    typeof data.stateVersion === "string" &&
    isRecord(data.scoreboardDelta) &&
    isGameStatus(data.scoreboardDelta.status)
  );
}

function isRematchLikeResponse(
  data: unknown,
): data is RematchResponse | { gameId: number; invitationLink?: string; success?: boolean } {
  return isRecord(data) && typeof data.gameId === "number";
}

function getNextStateVersion(response: Response): string | null {
  return response.headers.get("X-Game-State-Version") ?? response.headers.get("ETag");
}

/**
 * Fetches the current game state including throws and players.
 */
export async function getGameThrows(gameId: number): Promise<GameThrowsResponse> {
  const data: unknown = await apiClient.get(GAME_ENDPOINT(gameId));
  if (!isGameThrowsResponse(data)) {
    throw new ApiError("Unexpected response shape", { status: 200, data });
  }

  return data;
}

/**
 * Fetches game state conditionally and returns null if state has not changed.
 */
export async function getGameThrowsIfChanged(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameThrowsResponse | null> {
  const currentVersion = gameStateVersionById.get(gameId) ?? null;
  const { data, response } = await apiClient.request<ParsedResponse>(GAME_ENDPOINT(gameId), {
    method: "GET",
    query: currentVersion ? { since: currentVersion } : undefined,
    headers: {
      ...(currentVersion ? { "If-None-Match": currentVersion } : {}),
    },
    signal,
    acceptedStatuses: [304],
    returnResponse: true,
  });

  if (response.status === 304) {
    return null;
  }

  if (!isGameThrowsResponse(data)) {
    throw new ApiError("Unexpected response shape", {
      status: response.status,
      data,
      url: response.url,
    });
  }

  const nextVersion = getNextStateVersion(response);
  if (nextVersion) {
    gameStateVersionById.set(gameId, nextVersion);
  }

  return data;
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
  const data: unknown = await apiClient.post(FINISH_GAME_ENDPOINT(gameId));
  if (!isFinishedPlayerResponseArray(data)) {
    throw new ApiError("Unexpected response shape for finish game", { status: 200, data });
  }
  return data;
}

/**
 * Fetches final standings for a finished game.
 */
export async function getFinishedGame(gameId: number): Promise<FinishedPlayerResponse[]> {
  const data: unknown = await apiClient.get(FINISHED_GAME_ENDPOINT(gameId));
  if (!isFinishedPlayerResponseArray(data)) {
    throw new ApiError("Unexpected response shape for finished game", { status: 200, data });
  }
  return data;
}

/**
 * Reopens a finished game and returns the updated game state.
 */
export async function reopenGame(gameId: number): Promise<GameThrowsResponse> {
  const data: unknown = await apiClient.patch(REOPEN_GAME_ENDPOINT(gameId));
  if (!isGameThrowsResponse(data)) {
    throw new ApiError("Unexpected response shape for reopen game", { status: 200, data });
  }
  return data;
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
  const rematch: unknown = await apiClient.post(REMATCH_ENDPOINT(previousGameId));
  if (!isRematchLikeResponse(rematch)) {
    throw new ApiError("Unexpected response shape for rematch", { status: 200, data: rematch });
  }

  if ("invitationLink" in rematch && rematch.invitationLink) {
    return {
      success: "success" in rematch ? !!rematch.success : true,
      gameId: rematch.gameId,
      invitationLink: rematch.invitationLink,
    };
  }

  const invite: unknown = await apiClient.post(CREATE_INVITE_ENDPOINT(rematch.gameId));
  if (
    !isRecord(invite) ||
    typeof invite.gameId !== "number" ||
    typeof invite.invitationLink !== "string"
  ) {
    throw new ApiError("Unexpected response shape for invite", { status: 200, data: invite });
  }
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

function isGameSettingsResponse(data: unknown): data is GameSettingsResponse {
  return (
    isRecord(data) &&
    typeof data.startScore === "number" &&
    typeof data.doubleOut === "boolean" &&
    typeof data.tripleOut === "boolean"
  );
}

/**
 * Fetches the canonical settings for a game by its id.
 * Used to retrieve the original rules before starting a rematch.
 */
export async function getGameSettings(gameId: number): Promise<GameSettingsResponse> {
  const data: unknown = await apiClient.get(GAME_SETTINGS_ENDPOINT(gameId));
  if (!isGameSettingsResponse(data)) {
    throw new ApiError("Unexpected response shape for game settings", { status: 200, data });
  }
  return data;
}

/**
 * Creates game settings for a new game.
 */
async function createGameSettings(payload: CreateGameSettingsPayload): Promise<GameThrowsResponse> {
  const data: unknown = await apiClient.post(CREATE_GAME_SETTINGS_ENDPOINT, payload);
  if (!isGameThrowsResponse(data)) {
    throw new ApiError("Unexpected response shape for create game settings", { status: 200, data });
  }
  return data;
}

/**
 * Updates settings for an existing game.
 */
export async function updateGameSettings(
  gameId: number,
  payload: UpdateGameSettingsPayload,
): Promise<GameThrowsResponse> {
  const data: unknown = await apiClient.patch(GAME_SETTINGS_ENDPOINT(gameId), payload);
  if (!isGameThrowsResponse(data)) {
    throw new ApiError("Unexpected response shape for update game settings", { status: 200, data });
  }
  return data;
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
  const data: unknown = await apiClient.post(RECORD_THROW_ENDPOINT(gameId), payload);
  if (!isThrowAckResponse(data)) {
    throw new ApiError("Unexpected response shape for record throw", { status: 200, data });
  }
  return data;
}

/**
 * Undoes the last throw and returns the complete updated game state.
 */
export async function undoLastThrow(gameId: number): Promise<GameThrowsResponse> {
  const data: unknown = await apiClient.delete(UNDO_THROW_ENDPOINT(gameId));
  if (!isGameThrowsResponse(data)) {
    throw new ApiError("Unexpected response shape for undo throw", { status: 200, data });
  }
  return data;
}
