import * as v from "valibot";

// Schemas shared by 2+ files in shared/api/. A schema used by one file stays in that file.

/** Contract `integer`. */
export const integerSchema = v.pipe(v.number(), v.integer());

/** Contract `SuccessMessageDto`. */
export const successMessageResponseSchema = v.object({
  message: v.string(),
  success: v.optional(v.boolean(), true),
});

export type SuccessMessageResponse = v.InferOutput<typeof successMessageResponseSchema>;

// The contract types status as a plain string; these are the values the backend sends.
export const gameStatusSchema = v.picklist(["lobby", "started", "finished"]);

/** Contract `ThrowResponseDto`. */
export const playerThrowSchema = v.object({
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
  placement: v.optional(v.nullable(integerSchema), null),
  throwsInCurrentRound: v.optional(integerSchema, 0),
  currentRoundThrows: v.optional(v.array(playerThrowSchema), []),
  roundHistory: v.optional(v.array(roundHistorySchema), []),
  isGuest: v.optional(v.boolean(), false),
});

/** Contract `GameResponseDto`. */
export const gameThrowsResponseSchema = v.object({
  type: v.optional(v.picklist(["full-state"]), "full-state"),
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
});
