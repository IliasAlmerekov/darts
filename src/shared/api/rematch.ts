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
 * The server set up the rematch lobby, but starting it failed. The lobby stays open with the
 * previous game's players and settings, so the tablet can open it and start it by hand.
 */
export class RematchNotStartedError extends Error {
  readonly gameId: number;

  constructor(gameId: number, cause: unknown) {
    super(`Rematch lobby ${gameId} was created but not started`, { cause });
    this.name = "RematchNotStartedError";
    this.gameId = gameId;
  }
}

/**
 * Starts a rematch using canonical settings for the finished game.
 * The hook layer calls this single adapter so backend contract changes stay localized here.
 *
 * The settings are read before the lobby is requested, so a failed read leaves the server
 * untouched. A failed start after the lobby exists rejects with `RematchNotStartedError`.
 */
export async function startRematch(previousGameId: number): Promise<StartRematchResponse> {
  const settings = await getGameSettings(previousGameId);
  const rematch = await createRematchGame(previousGameId);

  try {
    await startGame(rematch.gameId, {
      startScore: settings.startScore,
      doubleOut: settings.doubleOut,
      tripleOut: settings.tripleOut,
      round: 1,
      status: "started",
    });
  } catch (error) {
    throw new RematchNotStartedError(rematch.gameId, error);
  }

  return {
    success: rematch.success,
    gameId: rematch.gameId,
    invitationLink: rematch.invitationLink,
    settings,
  };
}
