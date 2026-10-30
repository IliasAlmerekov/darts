import * as v from "valibot";
import { apiClient } from "./client";
import { GAME_ENDPOINT } from "./endpoints";
import { ApiError } from "./errors";
import { gameStatusSchema, gameThrowsResponseSchema, integerSchema } from "./schemas";
import type { GameThrowsResponse } from "./game";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const THROW_DELTA_ENDPOINT = (id: number) => `/game/${id}/throw/delta`;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

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

/**
 * Contract `ScoreboardPlayerDeltaDto`. Missing `position`, `placement` and `isBust` stay
 * absent. An omitted field is unchanged; an explicit null clears position or placement.
 */
const scoreboardPlayerDeltaSchema = v.object({
  playerId: integerSchema,
  name: v.string(),
  score: integerSchema,
  position: v.optional(v.nullable(integerSchema)),
  placement: v.optional(v.nullable(integerSchema)),
  isActive: v.boolean(),
  isGuest: v.boolean(),
  isBust: v.optional(v.nullable(v.boolean())),
});

/** Contract `ScoreboardDeltaDto`. */
const scoreboardDeltaSchema = v.object({
  changedPlayers: v.array(scoreboardPlayerDeltaSchema),
  winnerId: v.optional(v.nullable(integerSchema), null),
  status: gameStatusSchema,
  currentRound: integerSchema,
});

/** Contract `ThrowAckDto`. */
const throwAckResponseSchema = v.object({
  type: v.optional(v.picklist(["ack"]), "ack"),
  success: v.boolean(),
  gameId: integerSchema,
  stateVersion: v.string(),
  throw: v.optional(v.nullable(throwDeltaSchema), null),
  scoreboardDelta: scoreboardDeltaSchema,
  serverTs: v.string(),
});

/** Contract `UndoAckDto`. */
const undoAckResponseSchema = v.object({
  type: v.optional(v.picklist(["ack"]), "ack"),
  success: v.boolean(),
  gameId: integerSchema,
  stateVersion: v.string(),
  scoreboardDelta: scoreboardDeltaSchema,
  serverTs: v.string(),
});

export type ScoreboardDelta = v.InferOutput<typeof scoreboardDeltaSchema>;
export type ThrowAckResponse = v.InferOutput<typeof throwAckResponseSchema>;
export type UndoAckResponse = v.InferOutput<typeof undoAckResponseSchema>;

export interface ThrowRequest {
  playerId: number;
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
}

// ---------------------------------------------------------------------------
// ETag-based conditional game state fetching
// ---------------------------------------------------------------------------

const gameStateVersionById = new Map<number, string>();

function getNextStateVersion(response: Response): string | null {
  return response.headers.get("X-Game-State-Version") ?? response.headers.get("ETag");
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
// Throws
// ---------------------------------------------------------------------------

/**
 * Records a throw and returns compact server acknowledgement with scoreboard delta.
 */
export async function recordThrow(
  gameId: number,
  payload: ThrowRequest,
): Promise<ThrowAckResponse> {
  return apiClient.post(THROW_DELTA_ENDPOINT(gameId), payload, {
    validate: throwAckResponseSchema,
  });
}

/**
 * Undoes the last throw and returns a compact server acknowledgement with scoreboard delta.
 */
export async function undoLastThrow(gameId: number): Promise<UndoAckResponse> {
  const undo = await apiClient.delete(THROW_DELTA_ENDPOINT(gameId), {
    validate: undoAckResponseSchema,
  });

  setGameStateVersion(gameId, undo.stateVersion);

  return undo;
}
