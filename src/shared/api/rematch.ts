import * as v from "valibot";
import { apiClient } from "./client";
import { integerSchema } from "./schemas";
import { getGameSettings, startGame, type GameSettingsResponse } from "./game";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const REMATCH_ENDPOINT = (id: number) => `/room/${id}/rematch`;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Contract response of `POST /api/room/{id}/rematch`. */
const rematchResponseSchema = v.object({
  success: v.boolean(),
  gameId: integerSchema,
  invitationLink: v.string(),
});

type RematchGameResponse = v.InferOutput<typeof rematchResponseSchema>;

export interface StartRematchResponse extends RematchGameResponse {
  settings: GameSettingsResponse;
}

// ---------------------------------------------------------------------------
// Rematch
// ---------------------------------------------------------------------------

/**
 * Creates a rematch and returns the new game id with its invitation link.
 */
export async function createRematchGame(previousGameId: number): Promise<RematchGameResponse> {
  return apiClient.post(REMATCH_ENDPOINT(previousGameId), undefined, {
    validate: rematchResponseSchema,
  });
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
    invitationLink: rematch.invitationLink,
    settings,
  };
}
