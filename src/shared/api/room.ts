import { apiClient } from "./client";
import { ApiError } from "./errors";
import { createInviteEndpoint } from "./endpoints";
import { isRecord } from "@/shared/lib/guards";
import type {
  CreateRoomResponse,
  AddGuestPayload,
  GuestPlayer,
  CreateGameSettingsPayload,
} from "@/types";

function isCreateRoomResponse(data: unknown): data is CreateRoomResponse {
  return (
    isRecord(data) && typeof data.gameId === "number" && typeof data.invitationLink === "string"
  );
}

function isCreateRoomGameIdResponse(data: unknown): data is { gameId: number } {
  return isRecord(data) && data.success === true && typeof data.gameId === "number";
}

function isGuestPlayerResponse(data: unknown): data is { success: true; player: GuestPlayer } {
  const player = isRecord(data) && isRecord(data.player) ? data.player : null;

  return (
    isRecord(data) &&
    data.success === true &&
    player !== null &&
    typeof player.id === "number" &&
    typeof player.name === "string"
  );
}

function isMessageResponse(data: unknown): data is { message: string } {
  return isRecord(data) && typeof data.message === "string";
}

function isSuccessResponse(data: unknown): data is { success: boolean } {
  return isRecord(data) && typeof data.success === "boolean";
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

export type CreateGamePayload = Partial<CreateGameSettingsPayload> & {
  previousGameId?: number | undefined;
  playerIds?: number[];
  excludePlayerIds?: number[];
};

/**
 * Fetches an invitation link for a game.
 */
export async function getInvitation(
  gameId: number,
  signal?: AbortSignal,
): Promise<CreateRoomResponse> {
  const data: unknown = await apiClient.post(createInviteEndpoint(gameId), undefined, {
    ...(signal ? { signal } : {}),
    validate: isCreateRoomResponse,
  });
  if (!isCreateRoomResponse(data)) {
    throw new ApiError("Unexpected response shape for invitation", { status: 200, data });
  }
  return data;
}

/**
 * Creates a new room and returns its invitation payload.
 */
export async function createRoom(payload?: CreateGamePayload): Promise<CreateRoomResponse> {
  const hasPayload =
    payload !== undefined &&
    (typeof payload.previousGameId === "number" ||
      (Array.isArray(payload.playerIds) && payload.playerIds.length > 0) ||
      (Array.isArray(payload.excludePlayerIds) && payload.excludePlayerIds.length > 0) ||
      typeof payload.startScore === "number" ||
      typeof payload.doubleOut === "boolean" ||
      typeof payload.tripleOut === "boolean");
  const body = hasPayload && payload ? payload : {};

  const room: unknown = await apiClient.post(CREATE_ROOM_ENDPOINT, body, {
    validate: isCreateRoomGameIdResponse,
  });
  if (!isCreateRoomGameIdResponse(room)) {
    throw new ApiError("Unexpected response shape for create room", { status: 200, data: room });
  }
  const invite: unknown = await apiClient.post(createInviteEndpoint(room.gameId), undefined, {
    validate: isCreateRoomResponse,
  });
  if (!isCreateRoomResponse(invite)) {
    throw new ApiError("Unexpected response shape for room invitation", {
      status: 200,
      data: invite,
    });
  }

  return {
    gameId: invite.gameId,
    invitationLink: invite.invitationLink,
  };
}

/**
 * Leaves a game room as a specific player.
 */
export async function leaveRoom(gameId: number, playerId?: number): Promise<void> {
  const query = typeof playerId === "number" ? { playerId } : undefined;
  await apiClient.delete(ROOM_ENDPOINT(gameId), {
    ...(query ? { query } : {}),
    validate: isMessageResponse,
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
      validate: isSuccessResponse,
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
  const data: unknown = await apiClient.post(ADD_GUEST_ENDPOINT(gameId), payload, {
    validate: isGuestPlayerResponse,
  });
  if (!isGuestPlayerResponse(data)) {
    throw new ApiError("Unexpected response shape for add guest", { status: 200, data });
  }
  return data.player;
}
