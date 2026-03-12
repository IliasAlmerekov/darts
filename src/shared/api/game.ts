import { apiClient } from "./client";
import { ApiError } from "./errors";
import { createInviteEndpoint } from "./endpoints";
import type {
  GameStatus,
  GameSummaryResponse,
  GameThrowsResponse,
  ThrowAckResponse,
  ThrowRequest,
  UndoThrowResponse,
  UndoAckResponse,
  StartGameRequest,
} from "@/types";
import type {
  GameSettingsResponse,
  RematchGameResponse,
  RematchResponse,
  StartRematchResponse,
  UpdateGameSettingsPayload,
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
const GAME_SETTINGS_ENDPOINT = (id: number) => `/game/${id}/settings`;
const RECORD_THROW_ENDPOINT = (id: number) => `/game/${id}/throw/delta`;
const UNDO_THROW_ENDPOINT = (id: number) => `/game/${id}/throw`;

// ---------------------------------------------------------------------------
// ETag-based conditional game state fetching
// ---------------------------------------------------------------------------

const gameStateVersionById = new Map<number, string>();

const GAME_STATUS_VALUES: readonly GameStatus[] = ["lobby", "started", "finished"];

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
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

function isStartGameResponse(data: unknown): data is Record<string, unknown> {
  return isRecord(data);
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

function isGameSummaryWinnerResponse(
  data: unknown,
): data is { id: number; username: string | null } {
  return (
    isRecord(data) &&
    isFiniteNumber(data.id) &&
    (data.username === null || typeof data.username === "string")
  );
}

function isGameSummaryFinishedPlayerResponse(data: unknown): data is {
  playerId: number | null;
  username: string | null;
  position: number | null;
  roundsPlayed: number | null;
  roundAverage: number;
} {
  return (
    isRecord(data) &&
    (data.playerId === null || isFiniteNumber(data.playerId)) &&
    (data.username === null || typeof data.username === "string") &&
    (data.position === null || isFiniteNumber(data.position)) &&
    (data.roundsPlayed === null || isFiniteNumber(data.roundsPlayed)) &&
    isFiniteNumber(data.roundAverage)
  );
}

function isGameSummaryEnvelopeResponse(data: unknown): data is {
  gameId: number;
  finishedAt: string | null;
  winner: { id: number; username: string | null } | null;
  winnerRoundsPlayed: number;
  winnerRoundAverage: number;
  finishedPlayers: Array<{
    playerId: number | null;
    username: string | null;
    position: number | null;
    roundsPlayed: number | null;
    roundAverage: number;
  }>;
} {
  return (
    isRecord(data) &&
    isFiniteNumber(data.gameId) &&
    (data.finishedAt === null || typeof data.finishedAt === "string") &&
    (data.winner === null || isGameSummaryWinnerResponse(data.winner)) &&
    isFiniteNumber(data.winnerRoundsPlayed) &&
    isFiniteNumber(data.winnerRoundAverage) &&
    Array.isArray(data.finishedPlayers) &&
    data.finishedPlayers.every(isGameSummaryFinishedPlayerResponse)
  );
}

function normalizeFinishedPlayer(item: unknown, index: number): GameSummaryResponse[number] | null {
  if (!isRecord(item) || !isFiniteNumber(item.roundAverage)) {
    return null;
  }

  const playerId = isFiniteNumber(item.playerId) ? item.playerId : index + 1;
  const username =
    typeof item.username === "string" && item.username.trim().length > 0
      ? item.username
      : `Player ${index + 1}`;
  const position = isFiniteNumber(item.position) ? item.position : index + 1;
  const roundsPlayed = isFiniteNumber(item.roundsPlayed) ? item.roundsPlayed : 0;

  return {
    playerId,
    username,
    position,
    roundsPlayed,
    roundAverage: item.roundAverage,
  };
}

function normalizeGameSummaryResponse(data: unknown): GameSummaryResponse | null {
  if (isGameSummaryResponse(data)) {
    return data;
  }

  if (!isRecord(data) || !Array.isArray(data.finishedPlayers)) {
    return null;
  }

  const finishedPlayers = data.finishedPlayers
    .map((item, index) => normalizeFinishedPlayer(item, index))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return finishedPlayers.length === data.finishedPlayers.length ? finishedPlayers : null;
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
): data is RematchGameResponse | { gameId: number; invitationLink?: string; success?: boolean } {
  return (
    isRecord(data) &&
    isPositiveFiniteNumber(data.gameId) &&
    (data.invitationLink === undefined || typeof data.invitationLink === "string") &&
    (data.success === undefined || typeof data.success === "boolean")
  );
}

function isMessageResponse(data: unknown): data is { message: string } {
  return isRecord(data) && typeof data.message === "string";
}

function isConditionalGameStateResponse(data: unknown): data is GameThrowsResponse | null {
  return data === null || isGameThrowsResponse(data);
}

function isInvitationPayloadResponse(data: unknown): data is {
  success: boolean;
  status: number;
  gameId: number | null;
  invitationLink: string | null;
  users?: Array<{ id: number | null; username: string | null }>;
  message?: string | null;
} {
  return (
    isRecord(data) &&
    typeof data.success === "boolean" &&
    isFiniteNumber(data.status) &&
    (data.gameId === null || isFiniteNumber(data.gameId)) &&
    (data.invitationLink === null || typeof data.invitationLink === "string") &&
    (data.message === undefined || data.message === null || typeof data.message === "string") &&
    (data.users === undefined ||
      (Array.isArray(data.users) &&
        data.users.every(
          (user) =>
            isRecord(user) &&
            (user.id === null || isFiniteNumber(user.id)) &&
            (user.username === null || typeof user.username === "string"),
        )))
  );
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
  const data: unknown = await apiClient.get(GAME_ENDPOINT(gameId), {
    ...(signal ? { signal } : {}),
    validate: isGameThrowsResponse,
  });
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
  const { data, response } = await apiClient.request<unknown>(GAME_ENDPOINT(gameId), {
    method: "GET",
    ...(currentVersion ? { query: { since: currentVersion } } : {}),
    ...(currentVersion ? { headers: { "If-None-Match": currentVersion } } : {}),
    ...(signal ? { signal } : {}),
    acceptedStatuses: [304],
    returnResponse: true,
    validate: isConditionalGameStateResponse,
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
  await apiClient.post(
    START_GAME_ENDPOINT(gameId),
    {
      startscore: config.startScore,
      doubleout: config.doubleOut,
      tripleout: config.tripleOut,
    },
    {
      validate: isStartGameResponse,
    },
  );
}

/**
 * Marks a game as finished and returns final standings.
 */
export async function finishGame(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameSummaryResponse> {
  const data: unknown = await apiClient.post(FINISH_GAME_ENDPOINT(gameId), undefined, {
    ...(signal ? { signal } : {}),
    validate: isGameSummaryEnvelopeResponse,
  });
  const summary = normalizeGameSummaryResponse(data);
  if (!summary) {
    throw new ApiError("Unexpected response shape for finish game", { status: 200, data });
  }
  return summary;
}

/**
 * Fetches final standings for a finished game.
 */
export async function getFinishedGame(gameId: number): Promise<GameSummaryResponse> {
  const data: unknown = await apiClient.get(FINISHED_GAME_ENDPOINT(gameId), {
    validate: isGameSummaryEnvelopeResponse,
  });
  const summary = normalizeGameSummaryResponse(data);
  if (!summary) {
    throw new ApiError("Unexpected response shape for finished game", { status: 200, data });
  }
  return summary;
}

/**
 * Reopens a finished game and returns the updated game state.
 */
export async function reopenGame(gameId: number): Promise<GameThrowsResponse> {
  const data: unknown = await apiClient.patch(REOPEN_GAME_ENDPOINT(gameId), undefined, {
    validate: isGameThrowsResponse,
  });
  if (!isGameThrowsResponse(data)) {
    throw new ApiError("Unexpected response shape for reopen game", { status: 200, data });
  }
  return data;
}

/**
 * Aborts the specified game on the server.
 */
export async function abortGame(gameId: number): Promise<{ message: string }> {
  const data: unknown = await apiClient.patch(ABORT_GAME_ENDPOINT(gameId), undefined, {
    validate: isMessageResponse,
  });
  if (!isMessageResponse(data)) {
    throw new ApiError("Unexpected response shape for abort game", { status: 200, data });
  }

  return data;
}

/**
 * Creates a rematch and returns the new game id plus any invitation link already
 * provided by the backend. This does not trigger the invite fallback call.
 */
export async function createRematchGame(previousGameId: number): Promise<RematchGameResponse> {
  const rematch: unknown = await apiClient.post(REMATCH_ENDPOINT(previousGameId), undefined, {
    validate: isRematchLikeResponse,
  });
  if (!isRematchLikeResponse(rematch)) {
    throw new ApiError("Unexpected response shape for rematch", { status: 200, data: rematch });
  }

  return {
    success: "success" in rematch ? !!rematch.success : true,
    gameId: rematch.gameId,
    ...(rematch.invitationLink ? { invitationLink: rematch.invitationLink } : {}),
  };
}

/**
 * Creates a rematch and returns invitation details for the new game.
 */
export async function createRematch(previousGameId: number): Promise<RematchResponse> {
  const rematch = await createRematchGame(previousGameId);
  if (rematch.invitationLink) {
    return {
      success: rematch.success,
      gameId: rematch.gameId,
      invitationLink: rematch.invitationLink,
    };
  }

  const invite: unknown = await apiClient.post(createInviteEndpoint(rematch.gameId), undefined, {
    validate: isInvitationPayloadResponse,
  });
  if (
    !isRecord(invite) ||
    typeof invite.gameId !== "number" ||
    typeof invite.invitationLink !== "string"
  ) {
    throw new ApiError("Unexpected response shape for invite", { status: 200, data: invite });
  }
  return {
    success: rematch.success,
    gameId: invite.gameId,
    invitationLink: invite.invitationLink,
  };
}

/**
 * Starts a rematch using canonical settings for the finished game.
 * The hook layer calls this single adapter so backend contract changes stay localized here.
 */
export async function startRematch(previousGameId: number): Promise<StartRematchResponse> {
  const [settings, rematch] = await Promise.all([
    getGameSettings(previousGameId),
    createRematchGame(previousGameId),
  ]);

  await startGame(rematch.gameId, {
    startScore: settings.startScore,
    doubleOut: settings.doubleOut,
    tripleOut: settings.tripleOut,
    round: 1,
    status: "started",
  });

  return {
    success: rematch.success,
    gameId: rematch.gameId,
    settings,
    ...(rematch.invitationLink ? { invitationLink: rematch.invitationLink } : {}),
  };
}

// ---------------------------------------------------------------------------
// Game settings
// ---------------------------------------------------------------------------

/**
 * Fetches the canonical settings for a game by its id.
 * Used to retrieve the original rules before starting a rematch.
 */
export async function getGameSettings(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameSettingsResponse> {
  const data: unknown = await apiClient.get(GAME_SETTINGS_ENDPOINT(gameId), {
    ...(signal ? { signal } : {}),
    validate: isGameSettingsResponse,
  });
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
  const data: unknown = await apiClient.patch(GAME_SETTINGS_ENDPOINT(gameId), payload, {
    validate: (data): data is GameSettingsResponse | GameThrowsResponse =>
      isGameSettingsResponse(data) || isGameThrowsResponse(data),
  });
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
  payload: UpdateGameSettingsPayload,
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
  const data: unknown = await apiClient.post(RECORD_THROW_ENDPOINT(gameId), payload, {
    validate: isThrowAckResponse,
  });
  if (!isThrowAckResponse(data)) {
    throw new ApiError("Unexpected response shape for record throw", { status: 200, data });
  }
  return data;
}

/**
 * Undoes the last throw and returns either the legacy full game state or the
 * compact acknowledgement used by the targeted scoreboard update flow.
 */
export async function undoLastThrow(gameId: number): Promise<UndoThrowResponse> {
  const data: unknown = await apiClient.delete(UNDO_THROW_ENDPOINT(gameId), {
    validate: (data): data is UndoThrowResponse =>
      isGameThrowsResponse(data) || isUndoAckResponse(data),
  });
  if (isGameThrowsResponse(data)) {
    return data;
  }

  if (isUndoAckResponse(data)) {
    setGameStateVersion(gameId, data.stateVersion);
    return data;
  }

  throw new ApiError("Unexpected response shape for undo throw", { status: 200, data });
}
