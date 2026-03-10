import { apiClient } from "./client";
import { ApiError } from "./errors";
import type {
  GameStatus,
  GameSummaryResponse,
  GameThrowsResponse,
  ThrowAckResponse,
  ThrowRequest,
  UndoAckResponse,
  StartGameRequest,
} from "@/types";
import type { RematchResponse, CreateGameSettingsPayload, GameSettingsResponse } from "@/types";

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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isPlayerThrow(data: unknown): boolean {
  return (
    isRecord(data) &&
    isFiniteNumber(data.value) &&
    (data.isDouble === undefined || typeof data.isDouble === "boolean") &&
    (data.isTriple === undefined || typeof data.isTriple === "boolean") &&
    (data.isBust === undefined || typeof data.isBust === "boolean")
  );
}

function isRoundHistory(data: unknown): boolean {
  return (
    isRecord(data) &&
    (data.round === undefined || isFiniteNumber(data.round)) &&
    Array.isArray(data.throws) &&
    data.throws.every(isPlayerThrow)
  );
}

function isGamePlayer(data: unknown): boolean {
  return (
    isRecord(data) &&
    isFiniteNumber(data.id) &&
    typeof data.name === "string" &&
    isFiniteNumber(data.score) &&
    typeof data.isActive === "boolean" &&
    typeof data.isBust === "boolean" &&
    isNullableFiniteNumber(data.position) &&
    isFiniteNumber(data.throwsInCurrentRound) &&
    Array.isArray(data.currentRoundThrows) &&
    data.currentRoundThrows.every(isPlayerThrow) &&
    Array.isArray(data.roundHistory) &&
    data.roundHistory.every(isRoundHistory)
  );
}

function isGameSettingsResponse(data: unknown): data is GameSettingsResponse {
  return (
    isRecord(data) &&
    isFiniteNumber(data.startScore) &&
    typeof data.doubleOut === "boolean" &&
    typeof data.tripleOut === "boolean"
  );
}

function isGameStatus(value: unknown): value is GameStatus {
  return typeof value === "string" && GAME_STATUS_VALUES.includes(value as GameStatus);
}

function isGameThrowsResponse(data: unknown): data is GameThrowsResponse {
  if (!isRecord(data)) {
    return false;
  }

  return (
    isFiniteNumber(data.id) &&
    isGameStatus(data.status) &&
    isFiniteNumber(data.currentRound) &&
    isNullableFiniteNumber(data.activePlayerId) &&
    isFiniteNumber(data.currentThrowCount) &&
    Array.isArray(data.players) &&
    data.players.every(isGamePlayer) &&
    isNullableFiniteNumber(data.winnerId) &&
    isGameSettingsResponse(data.settings)
  );
}

function isGameSummaryResponse(data: unknown): data is GameSummaryResponse {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        isRecord(item) &&
        isFiniteNumber(item.playerId) &&
        typeof item.username === "string" &&
        isFiniteNumber(item.position) &&
        isFiniteNumber(item.roundsPlayed) &&
        isFiniteNumber(item.roundAverage),
    )
  );
}

function isUndoAckResponse(data: unknown): data is UndoAckResponse {
  if (!isRecord(data)) {
    return false;
  }

  return (
    typeof data.success === "boolean" &&
    isFiniteNumber(data.gameId) &&
    typeof data.stateVersion === "string" &&
    isScoreboardDelta(data.scoreboardDelta) &&
    typeof data.serverTs === "string"
  );
}

function isThrowDelta(data: unknown): boolean {
  return (
    isRecord(data) &&
    isFiniteNumber(data.id) &&
    isFiniteNumber(data.playerId) &&
    typeof data.playerName === "string" &&
    isFiniteNumber(data.value) &&
    typeof data.isDouble === "boolean" &&
    typeof data.isTriple === "boolean" &&
    typeof data.isBust === "boolean" &&
    isFiniteNumber(data.score) &&
    isFiniteNumber(data.roundNumber) &&
    typeof data.timestamp === "string"
  );
}

function isScoreboardPlayerDelta(data: unknown): boolean {
  return (
    isRecord(data) &&
    isFiniteNumber(data.playerId) &&
    typeof data.name === "string" &&
    isFiniteNumber(data.score) &&
    isNullableFiniteNumber(data.position) &&
    typeof data.isActive === "boolean" &&
    typeof data.isGuest === "boolean" &&
    (data.isBust === null || typeof data.isBust === "boolean")
  );
}

function isScoreboardDelta(data: unknown): boolean {
  return (
    isRecord(data) &&
    Array.isArray(data.changedPlayers) &&
    data.changedPlayers.every(isScoreboardPlayerDelta) &&
    isNullableFiniteNumber(data.winnerId) &&
    isGameStatus(data.status) &&
    isFiniteNumber(data.currentRound)
  );
}

function isThrowAckResponse(data: unknown): data is ThrowAckResponse {
  if (!isRecord(data)) {
    return false;
  }

  return (
    typeof data.success === "boolean" &&
    isFiniteNumber(data.gameId) &&
    typeof data.stateVersion === "string" &&
    (data.throw === null || isThrowDelta(data.throw)) &&
    isScoreboardDelta(data.scoreboardDelta) &&
    typeof data.serverTs === "string"
  );
}

function isRematchLikeResponse(
  data: unknown,
): data is RematchResponse | { gameId: number; invitationLink?: string; success?: boolean } {
  return (
    isRecord(data) &&
    isFiniteNumber(data.gameId) &&
    (data.invitationLink === undefined || typeof data.invitationLink === "string") &&
    (data.success === undefined || typeof data.success === "boolean")
  );
}

function isMessageResponse(data: unknown): data is { message: string } {
  return isRecord(data) && typeof data.message === "string";
}

function extractGameSettingsResponse(data: unknown): GameSettingsResponse | null {
  if (isGameSettingsResponse(data)) {
    return data;
  }

  if (isGameThrowsResponse(data)) {
    return data.settings;
  }

  return null;
}

function getNextStateVersion(response: Response): string | null {
  return response.headers.get("X-Game-State-Version") ?? response.headers.get("ETag");
}

/**
 * Fetches the current game state including throws and players.
 */
export async function getGameThrows(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameThrowsResponse> {
  const data: unknown = await apiClient.get(GAME_ENDPOINT(gameId), signal ? { signal } : undefined);
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
    ...(currentVersion ? { query: { since: currentVersion } } : {}),
    ...(currentVersion ? { headers: { "If-None-Match": currentVersion } } : {}),
    ...(signal ? { signal } : {}),
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
export async function finishGame(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameSummaryResponse> {
  const data: unknown = await apiClient.post(
    FINISH_GAME_ENDPOINT(gameId),
    undefined,
    signal ? { signal } : undefined,
  );
  if (!isGameSummaryResponse(data)) {
    throw new ApiError("Unexpected response shape for finish game", { status: 200, data });
  }
  return data;
}

/**
 * Fetches final standings for a finished game.
 */
export async function getFinishedGame(gameId: number): Promise<GameSummaryResponse> {
  const data: unknown = await apiClient.get(FINISHED_GAME_ENDPOINT(gameId));
  if (!isGameSummaryResponse(data)) {
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
  const data: unknown = await apiClient.patch(ABORT_GAME_ENDPOINT(gameId));
  if (!isMessageResponse(data)) {
    throw new ApiError("Unexpected response shape for abort game", { status: 200, data });
  }

  return data;
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

/**
 * Fetches the canonical settings for a game by its id.
 * Used to retrieve the original rules before starting a rematch.
 */
export async function getGameSettings(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameSettingsResponse> {
  const data: unknown = await apiClient.get(
    GAME_SETTINGS_ENDPOINT(gameId),
    signal ? { signal } : undefined,
  );
  if (!isGameSettingsResponse(data)) {
    throw new ApiError("Unexpected response shape for game settings", { status: 200, data });
  }
  return data;
}

/**
 * Updates settings for an existing game.
 */
export async function updateGameSettings(
  gameId: number,
  payload: UpdateGameSettingsPayload,
): Promise<GameSettingsResponse> {
  const data: unknown = await apiClient.patch(GAME_SETTINGS_ENDPOINT(gameId), payload);
  const settings = extractGameSettingsResponse(data);
  if (!settings) {
    throw new ApiError("Unexpected response shape for update game settings", { status: 200, data });
  }
  return settings;
}

/**
 * Saves settings for an existing game and rejects when game id is missing.
 */
export async function saveGameSettings(
  payload: CreateGameSettingsPayload,
  gameId?: number | null,
): Promise<GameSettingsResponse> {
  if (typeof gameId !== "number" || !Number.isFinite(gameId)) {
    throw new ApiError("Cannot save game settings without an active gameId", {
      status: 400,
      data: payload,
    });
  }

  return updateGameSettings(gameId, payload);
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
 * Undoes the last throw. During phased rollout the backend may still return a full
 * game state; once compact undo acknowledgements are enabled we re-fetch the state here
 * to preserve the existing public contract for callers.
 */
export async function undoLastThrow(gameId: number): Promise<GameThrowsResponse> {
  const data: unknown = await apiClient.delete(UNDO_THROW_ENDPOINT(gameId));
  if (isGameThrowsResponse(data)) {
    return data;
  }

  if (isUndoAckResponse(data)) {
    setGameStateVersion(gameId, data.stateVersion);
    return getGameThrows(gameId);
  }

  throw new ApiError("Unexpected response shape for undo throw", { status: 200, data });
}
