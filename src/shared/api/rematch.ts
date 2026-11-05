import * as v from "valibot";
import { apiClient } from "./client";
import { integerSchema } from "./schemas";

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
