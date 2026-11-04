import * as v from "valibot";
import { apiClient } from "./client";
import { gameStatusSchema, integerSchema } from "./schemas";

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
 * Contract `ScoreboardPlayerDeltaDto`. Missing `position` and `placement` stay absent: an
 * omitted field is unchanged, an explicit null clears it. A missing `isBust` becomes the
 * contract default `null`, which leaves the player's bust flag unchanged.
 */
const scoreboardPlayerDeltaSchema = v.object({
  playerId: integerSchema,
  name: v.string(),
  score: integerSchema,
  position: v.optional(v.nullable(integerSchema)),
  placement: v.optional(v.nullable(integerSchema)),
  isActive: v.boolean(),
  isGuest: v.boolean(),
  isBust: v.optional(v.nullable(v.boolean()), null),
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
  return apiClient.delete(THROW_DELTA_ENDPOINT(gameId), {
    validate: undoAckResponseSchema,
  });
}
