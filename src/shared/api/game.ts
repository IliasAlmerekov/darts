import * as v from "valibot";
import { apiClient } from "./client";
import { ApiError } from "./errors";
import { createInviteEndpoint } from "./endpoints";
import {
  integerSchema,
  invitationResponseSchema,
  successMessageResponseSchema,
  type SuccessMessageResponse,
} from "./schemas";
import type {
  FinishedPlayerResponse,
  GameSummaryResponse,
  ThrowRequest,
  StartGameRequest,
  RematchGameResponse,
  RematchResponse,
  StartRematchResponse,
  UpdateGameSettingsPayload,
} from "@/types";
import { clientLogger } from "@/shared/services/browser/clientLogger";

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
// Schemas
// ---------------------------------------------------------------------------

// The contract types status as a plain string; these are the values the backend sends.
const gameStatusSchema = v.picklist(["lobby", "started", "finished"]);

/** Contract `ThrowResponseDto`. */
const playerThrowSchema = v.object({
  value: integerSchema,
  isDouble: v.boolean(),
  isTriple: v.boolean(),
  isBust: v.boolean(),
});

// The contract types a round as a map of integers and throw lists.
const roundHistorySchema = v.object({
  round: v.optional(integerSchema),
  throws: v.array(playerThrowSchema),
});

/** Contract `PlayerResponseDto`. */
const gamePlayerSchema = v.object({
  id: integerSchema,
  name: v.string(),
  score: integerSchema,
  isActive: v.boolean(),
  isBust: v.boolean(),
  position: v.optional(v.nullable(integerSchema), null),
  throwsInCurrentRound: v.optional(integerSchema, 0),
  currentRoundThrows: v.optional(v.array(playerThrowSchema), []),
  roundHistory: v.optional(v.array(roundHistorySchema), []),
  isGuest: v.boolean(),
});

/** Contract `GameResponseDto`, tagged `type: "full-state"` for the undo union. */
const gameThrowsResponseSchema = v.pipe(
  v.object({
    id: integerSchema,
    status: gameStatusSchema,
    currentRound: integerSchema,
    activePlayerId: v.optional(v.nullable(integerSchema), null),
    currentThrowCount: integerSchema,
    players: v.array(gamePlayerSchema),
    winnerId: v.optional(v.nullable(integerSchema), null),
    // The contract types settings as an open map; the game reads these three keys.
    settings: v.object({
      startScore: integerSchema,
      doubleOut: v.boolean(),
      tripleOut: v.boolean(),
    }),
  }),
  v.transform((game) => ({ type: "full-state" as const, ...game })),
);

/** Contract `GameSettingsResponseDto`. */
const gameSettingsResponseSchema = v.object({
  gameId: integerSchema,
  startScore: integerSchema,
  doubleOut: v.boolean(),
  tripleOut: v.boolean(),
  status: v.string(),
});

/** Contract `GameSummaryResponseDto`. */
const gameSummaryEnvelopeSchema = v.object({
  gameId: integerSchema,
  finishedAt: v.optional(v.nullable(v.string())),
  winner: v.optional(
    v.nullable(
      v.object({
        id: integerSchema,
        username: v.optional(v.nullable(v.string())),
      }),
    ),
  ),
  winnerRoundsPlayed: integerSchema,
  winnerRoundAverage: v.number(),
  finishedPlayers: v.array(
    v.object({
      playerId: v.optional(v.nullable(integerSchema)),
      username: v.optional(v.nullable(v.string())),
      position: v.optional(v.nullable(integerSchema)),
      roundsPlayed: v.optional(v.nullable(integerSchema)),
      roundAverage: v.number(),
    }),
  ),
});

// #121 owns aligning the delta schemas with the contract. Until then they keep the old
// guard rules: position, isBust, winnerId and throw are required keys here although the
// contract makes them optional.

/** Contract `ThrowDeltaDto`. */
const throwDeltaSchema = v.object({
  id: integerSchema,
  playerId: integerSchema,
  playerName: v.string(),
  value: integerSchema,
  isDouble: v.boolean(),
  isTriple: v.boolean(),
  isBust: v.boolean(),
  score: integerSchema,
  roundNumber: integerSchema,
  timestamp: v.string(),
});

/** Contract `ScoreboardPlayerDeltaDto`. */
const scoreboardPlayerDeltaSchema = v.object({
  playerId: integerSchema,
  name: v.string(),
  score: integerSchema,
  position: v.nullable(integerSchema),
  isActive: v.boolean(),
  isGuest: v.boolean(),
  isBust: v.nullable(v.boolean()),
});

/** Contract `ScoreboardDeltaDto`. */
const scoreboardDeltaSchema = v.object({
  changedPlayers: v.array(scoreboardPlayerDeltaSchema),
  winnerId: v.nullable(integerSchema),
  status: gameStatusSchema,
  currentRound: integerSchema,
});

/** Contract `ThrowAckDto`. */
const throwAckResponseSchema = v.object({
  success: v.boolean(),
  gameId: integerSchema,
  stateVersion: v.string(),
  throw: v.nullable(throwDeltaSchema),
  scoreboardDelta: scoreboardDeltaSchema,
  serverTs: v.string(),
});

/** Contract `UndoAckDto`, tagged `type: "ack"` for the undo union. */
const undoAckResponseSchema = v.pipe(
  v.object({
    success: v.boolean(),
    gameId: integerSchema,
    stateVersion: v.string(),
    scoreboardDelta: scoreboardDeltaSchema,
    serverTs: v.string(),
  }),
  v.transform((ack) => ({ type: "ack" as const, ...ack })),
);

// The contract documents GameResponseDto for DELETE /throw; the backend also answers with
// UndoAckDto during the compact-delta rollout. #101 owns that union.
const undoThrowResponseSchema = v.union([gameThrowsResponseSchema, undoAckResponseSchema]);

// #121 owns validating the start response against the contract; any object passes here.
const startGameResponseSchema = v.looseObject({});

/** Contract response of `POST /api/room/{id}/rematch`. */
const rematchResponseSchema = v.object({
  success: v.boolean(),
  gameId: v.optional(v.nullable(integerSchema)),
  invitationLink: v.optional(v.nullable(v.string())),
  message: v.optional(v.nullable(v.string())),
  status: v.optional(v.nullable(integerSchema)),
});

export type GameStatus = v.InferOutput<typeof gameStatusSchema>;
export type PlayerThrow = v.InferOutput<typeof playerThrowSchema>;
export type GameThrowsResponse = v.InferOutput<typeof gameThrowsResponseSchema>;
export type GameSettingsResponse = v.InferOutput<typeof gameSettingsResponseSchema>;
export type ScoreboardDelta = v.InferOutput<typeof scoreboardDeltaSchema>;
export type ThrowAckResponse = v.InferOutput<typeof throwAckResponseSchema>;
export type UndoAckResponse = v.InferOutput<typeof undoAckResponseSchema>;
export type UndoThrowResponse = v.InferOutput<typeof undoThrowResponseSchema>;

// ---------------------------------------------------------------------------
// ETag-based conditional game state fetching
// ---------------------------------------------------------------------------

const gameStateVersionById = new Map<number, string>();

function toFinishedPlayer(
  item: v.InferOutput<typeof gameSummaryEnvelopeSchema>["finishedPlayers"][number],
  index: number,
  gameId: number,
): FinishedPlayerResponse {
  if (typeof item.roundsPlayed !== "number") {
    clientLogger.warn("game.finished-player.rounds-played.missing", {
      context: { gameId, playerId: item.playerId ?? null, index },
    });
  }

  return {
    playerId: item.playerId ?? index + 1,
    username:
      typeof item.username === "string" && item.username.trim().length > 0
        ? item.username
        : `Player ${index + 1}`,
    position: item.position ?? index + 1,
    roundsPlayed: item.roundsPlayed ?? 0,
    roundAverage: item.roundAverage,
  };
}

function toGameSummary(
  summary: v.InferOutput<typeof gameSummaryEnvelopeSchema>,
  gameId: number,
): GameSummaryResponse {
  return summary.finishedPlayers.map((item, index) => toFinishedPlayer(item, index, gameId));
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
  return apiClient.get(GAME_ENDPOINT(gameId), {
    ...(signal ? { signal } : {}),
    validate: gameThrowsResponseSchema,
  });
}

/**
 * Fetches game state conditionally and returns null if state has not changed.
 */
export async function getGameThrowsIfChanged(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameThrowsResponse | null> {
  const currentVersion = gameStateVersionById.get(gameId) ?? null;
  const { data, response } = await apiClient.request(GAME_ENDPOINT(gameId), {
    method: "GET",
    ...(currentVersion ? { query: { since: currentVersion } } : {}),
    ...(currentVersion ? { headers: { "If-None-Match": currentVersion } } : {}),
    ...(signal ? { signal } : {}),
    acceptedStatuses: [304],
    returnResponse: true,
    // A 304 has no body, so the client hands the schema null.
    validate: v.nullable(gameThrowsResponseSchema),
  });

  if (response.status === 304) {
    return null;
  }

  if (data === null) {
    throw new ApiError("Game state response has no body", {
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
      validate: startGameResponseSchema,
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
  const summary = await apiClient.post(FINISH_GAME_ENDPOINT(gameId), undefined, {
    ...(signal ? { signal } : {}),
    validate: gameSummaryEnvelopeSchema,
  });
  return toGameSummary(summary, gameId);
}

/**
 * Fetches final standings for a finished game.
 */
export async function getFinishedGame(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameSummaryResponse> {
  const summary = await apiClient.get(FINISHED_GAME_ENDPOINT(gameId), {
    ...(signal ? { signal } : {}),
    validate: gameSummaryEnvelopeSchema,
  });
  return toGameSummary(summary, gameId);
}

/**
 * Reopens a finished game and returns the updated game state.
 */
export async function reopenGame(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.patch(REOPEN_GAME_ENDPOINT(gameId), undefined, {
    validate: gameThrowsResponseSchema,
  });
}

/**
 * Aborts the specified game on the server.
 */
export async function abortGame(gameId: number): Promise<SuccessMessageResponse> {
  return apiClient.patch(ABORT_GAME_ENDPOINT(gameId), undefined, {
    validate: successMessageResponseSchema,
  });
}

/**
 * Creates a rematch and returns the new game id plus any invitation link already
 * provided by the backend. This does not trigger the invite fallback call.
 */
export async function createRematchGame(previousGameId: number): Promise<RematchGameResponse> {
  const rematch = await apiClient.post(REMATCH_ENDPOINT(previousGameId), undefined, {
    validate: rematchResponseSchema,
  });
  // The contract allows a null game id, for example when the previous game does not exist.
  if (typeof rematch.gameId !== "number") {
    throw new ApiError("Rematch response has no game id", {
      status: rematch.status ?? 200,
      data: rematch,
    });
  }

  return {
    success: rematch.success,
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

  const invite = await apiClient.post(createInviteEndpoint(rematch.gameId), undefined, {
    validate: invitationResponseSchema,
  });
  // The contract allows a null game id and link; without them there is nothing to join.
  if (typeof invite.gameId !== "number" || typeof invite.invitationLink !== "string") {
    throw new ApiError("Invitation response has no game id or link", {
      status: 200,
      data: invite,
    });
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
  return apiClient.get(GAME_SETTINGS_ENDPOINT(gameId), {
    ...(signal ? { signal } : {}),
    validate: gameSettingsResponseSchema,
  });
}

/**
 * Updates settings for an existing game.
 */
export async function updateGameSettings(
  gameId: number,
  payload: UpdateGameSettingsPayload,
): Promise<GameSettingsResponse> {
  return apiClient.patch(GAME_SETTINGS_ENDPOINT(gameId), payload, {
    validate: gameSettingsResponseSchema,
  });
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
  return apiClient.post(RECORD_THROW_ENDPOINT(gameId), payload, {
    validate: throwAckResponseSchema,
  });
}

/**
 * Undoes the last throw and returns either the full game state or the compact
 * acknowledgement used by the targeted scoreboard update flow.
 */
export async function undoLastThrow(gameId: number): Promise<UndoThrowResponse> {
  const undo = await apiClient.delete(UNDO_THROW_ENDPOINT(gameId), {
    validate: undoThrowResponseSchema,
  });

  if (undo.type === "ack") {
    setGameStateVersion(gameId, undo.stateVersion);
  }

  return undo;
}
