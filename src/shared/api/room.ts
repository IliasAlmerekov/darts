import { apiClient } from "./client";
import { ApiError } from "./errors";
import type { CreateRoomResponse, AddGuestPayload, GuestPlayer } from "@/types";

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null;
}

function isCreateRoomResponse(data: unknown): data is CreateRoomResponse {
  return (
    isRecord(data) && typeof data.gameId === "number" && typeof data.invitationLink === "string"
  );
}

function isGuestPlayerResponse(data: unknown): data is { success: true; player: GuestPlayer } {
  return (
    isRecord(data) &&
    data.success === true &&
    isRecord(data.player) &&
    typeof (data.player as Record<string, unknown>).id === "number" &&
    typeof (data.player as Record<string, unknown>).name === "string"
  );
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const CREATE_ROOM_ENDPOINT = "/room/create";
const CREATE_INVITE_ENDPOINT = (id: number) => `/invite/create/${id}`;
const ROOM_ENDPOINT = (id: number) => `/room/${id}`;
const UPDATE_PLAYER_ORDER_ENDPOINT = (id: number) => `/room/${id}/positions`;
const ADD_GUEST_ENDPOINT = (id: number) => `/room/${id}/guest`;

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

export type CreateGamePayload = {
  previousGameId?: number;
  playerIds?: number[];
};

/**
 * Fetches an invitation link for a game.
 */
export async function getInvitation(gameId: number): Promise<CreateRoomResponse> {
  const data: unknown = await apiClient.post(CREATE_INVITE_ENDPOINT(gameId));
  if (!isCreateRoomResponse(data)) {
    throw new ApiError("Unexpected response shape for invitation", { status: 200, data });
  }
  return data;
}

/**
 * Creates a new room and returns its invitation payload.
 */
export async function createRoom(payload?: CreateGamePayload): Promise<CreateRoomResponse> {
  const body =
    payload && (payload.previousGameId || (payload.playerIds && payload.playerIds.length > 0))
      ? payload
      : {};

  const room: unknown = await apiClient.post(CREATE_ROOM_ENDPOINT, body);
  if (!isRecord(room) || typeof room.gameId !== "number") {
    throw new ApiError("Unexpected response shape for create room", { status: 200, data: room });
  }
  const invite: unknown = await apiClient.post(CREATE_INVITE_ENDPOINT(room.gameId));
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
  return apiClient.delete(ROOM_ENDPOINT(gameId), query ? { query } : undefined);
}

/**
 * Persists player ordering for a game room.
 */
export async function updatePlayerOrder(
  gameId: number,
  positions: Array<{ playerId: number; position: number }>,
): Promise<void> {
  return apiClient.post(UPDATE_PLAYER_ORDER_ENDPOINT(gameId), { positions });
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
  const data: unknown = await apiClient.post(ADD_GUEST_ENDPOINT(gameId), payload);
  if (!isGuestPlayerResponse(data)) {
    throw new ApiError("Unexpected response shape for add guest", { status: 200, data });
  }
  return data.player;
}
