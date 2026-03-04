import { apiClient } from "@/lib/api";
import type { CreateRoomResponse, AddGuestPayload, GuestPlayer } from "@/types";

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
  return apiClient.post<CreateRoomResponse>(CREATE_INVITE_ENDPOINT(gameId));
}

/**
 * Creates a new room and returns its invitation payload.
 */
export async function createRoom(payload?: CreateGamePayload): Promise<CreateRoomResponse> {
  const body =
    payload && (payload.previousGameId || (payload.playerIds && payload.playerIds.length > 0))
      ? payload
      : {};

  const room = await apiClient.post<{ gameId: number }>(CREATE_ROOM_ENDPOINT, body);
  const invite = await apiClient.post<CreateRoomResponse>(CREATE_INVITE_ENDPOINT(room.gameId));

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

type AddGuestSuccessResponse = {
  success: true;
  player: GuestPlayer;
};

/**
 * Adds a guest player to a game room.
 */
export async function addGuestPlayer(
  gameId: number,
  payload: AddGuestPayload,
): Promise<GuestPlayer> {
  const response = await apiClient.post<AddGuestSuccessResponse>(ADD_GUEST_ENDPOINT(gameId), payload);
  return response.player;
}
