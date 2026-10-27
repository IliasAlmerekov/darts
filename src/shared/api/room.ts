import * as v from "valibot";
import { apiClient } from "./client";
import { ApiError } from "./errors";
import { createInviteEndpoint } from "./endpoints";
import { integerSchema, invitationResponseSchema, successMessageResponseSchema } from "./schemas";
import type { AddGuestPayload, CreateGameSettingsPayload } from "@/types";

const createRoomResponseSchema = v.object({
  success: v.boolean(),
  gameId: v.nullable(integerSchema),
});

const updatePlayerOrderResponseSchema = v.object({
  success: v.boolean(),
});

// The contract marks no player field as required; a guest without id and name cannot be shown.
const addGuestResponseSchema = v.object({
  success: v.boolean(),
  player: v.object({
    id: integerSchema,
    name: v.string(),
    position: v.optional(v.nullable(integerSchema), null),
    placement: v.optional(v.nullable(integerSchema)),
    isGuest: v.optional(v.boolean()),
  }),
});

interface RoomInvitation {
  gameId: number;
  invitationLink: string;
}

type GuestPlayer = v.InferOutput<typeof addGuestResponseSchema>["player"];

/**
 * Reads the game id and link from an invitation. The contract allows both to be null, for
 * example when the game does not exist; without them there is nothing to join.
 */
function toRoomInvitation(invite: v.InferOutput<typeof invitationResponseSchema>): RoomInvitation {
  if (typeof invite.gameId !== "number" || typeof invite.invitationLink !== "string") {
    throw new ApiError("Invitation response has no game id or link", {
      status: 200,
      data: invite,
    });
  }

  return { gameId: invite.gameId, invitationLink: invite.invitationLink };
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const CREATE_ROOM_ENDPOINT = "/room/create";
const ROOM_ENDPOINT = (id: number) => `/room/${id}`;
const UPDATE_PLAYER_ORDER_ENDPOINT = (id: number) => `/room/${id}/positions`;
const ADD_GUEST_ENDPOINT = (id: number) => `/room/${id}/guest`;

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

type CreateGamePayload = Partial<CreateGameSettingsPayload> & {
  playerIds?: number[];
  excludePlayerIds?: number[];
};

/**
 * Fetches an invitation link for a game.
 */
export async function getInvitation(gameId: number, signal?: AbortSignal): Promise<RoomInvitation> {
  const invite = await apiClient.post(createInviteEndpoint(gameId), undefined, {
    ...(signal ? { signal } : {}),
    validate: invitationResponseSchema,
  });
  return toRoomInvitation(invite);
}

/**
 * Creates a new room and returns its invitation payload.
 */
export async function createRoom(payload?: CreateGamePayload): Promise<RoomInvitation> {
  const hasPayload =
    payload !== undefined &&
    ((Array.isArray(payload.playerIds) && payload.playerIds.length > 0) ||
      (Array.isArray(payload.excludePlayerIds) && payload.excludePlayerIds.length > 0) ||
      typeof payload.startScore === "number" ||
      typeof payload.doubleOut === "boolean" ||
      typeof payload.tripleOut === "boolean");
  const body = hasPayload && payload ? payload : {};

  const room = await apiClient.post(CREATE_ROOM_ENDPOINT, body, {
    validate: createRoomResponseSchema,
  });
  if (room.gameId === null) {
    throw new ApiError("Create room response has no game id", { status: 200, data: room });
  }
  const invite = await apiClient.post(createInviteEndpoint(room.gameId), undefined, {
    validate: invitationResponseSchema,
  });

  return toRoomInvitation(invite);
}

/**
 * Leaves a game room as a specific player.
 */
export async function leaveRoom(gameId: number, playerId?: number): Promise<void> {
  const query = typeof playerId === "number" ? { playerId } : undefined;
  await apiClient.delete(ROOM_ENDPOINT(gameId), {
    ...(query ? { query } : {}),
    validate: successMessageResponseSchema,
  });
}

/**
 * Persists player ordering for a game room.
 */
export async function updatePlayerOrder(
  gameId: number,
  positions: Array<{ playerId: number; position: number }>,
): Promise<void> {
  await apiClient.post(
    UPDATE_PLAYER_ORDER_ENDPOINT(gameId),
    { positions },
    {
      validate: updatePlayerOrderResponseSchema,
    },
  );
}

// ---------------------------------------------------------------------------
// Guest players
// ---------------------------------------------------------------------------

/**
 * Adds a guest player to a game room.
 */
export async function addGuestPlayer(
  gameId: number,
  payload: AddGuestPayload,
): Promise<GuestPlayer> {
  const data = await apiClient.post(ADD_GUEST_ENDPOINT(gameId), payload, {
    validate: addGuestResponseSchema,
  });
  return data.player;
}
