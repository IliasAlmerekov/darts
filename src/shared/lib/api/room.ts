import { apiClient } from "@/lib/api";
import type { CreateRoomResponse } from "@/types";

const CREATE_ROOM_ENDPOINT = "/room/create";
const CREATE_INVITE_ENDPOINT = (id: number) => `/invite/create/${id}`;
const ADD_GUEST_ENDPOINT = (id: number) => `/room/${id}/guest`;
const ROOM_ENDPOINT = (id: number) => `/room/${id}`;
const UPDATE_PLAYER_ORDER_ENDPOINT = (id: number) => `/room/${id}/positions`;

export type CreateGamePayload = {
  previousGameId?: number;
  playerIds?: number[];
};

export type AddGuestPayload = {
  username: string;
};

export type GuestPlayer = {
  id: number;
  name: string;
  position?: number | null;
};

export type AddGuestSuccessResponse = {
  success: true;
  player: GuestPlayer;
};

export type AddGuestErrorResponse = {
  success: false;
  error: "USERNAME_TAKEN";
  message: string;
  suggestions?: string[];
};

export async function getInvitation(gameId: number): Promise<CreateRoomResponse> {
  return apiClient.post<CreateRoomResponse>(CREATE_INVITE_ENDPOINT(gameId));
}

async function handleCreateGame(payload?: CreateGamePayload): Promise<CreateRoomResponse> {
  const body =
    payload && (payload.previousGameId || (payload.playerIds && payload.playerIds.length > 0))
      ? payload
      : {};

  const room = await apiClient.post<{ gameId: number }>(CREATE_ROOM_ENDPOINT, body);
  return apiClient.post<CreateRoomResponse>(CREATE_INVITE_ENDPOINT(room.gameId));
}

export async function createRoom(payload?: CreateGamePayload): Promise<CreateRoomResponse> {
  return handleCreateGame(payload);
}

export async function addGuestPlayer(
  gameId: number,
  payload: AddGuestPayload,
): Promise<GuestPlayer> {
  const response = await apiClient.post<AddGuestSuccessResponse>(
    ADD_GUEST_ENDPOINT(gameId),
    payload,
  );

  return response.player;
}

export async function leaveRoom(gameId: number, playerId?: number): Promise<void> {
  const query = typeof playerId === "number" ? { playerId } : undefined;
  return apiClient.delete(ROOM_ENDPOINT(gameId), query ? { query } : undefined);
}

export async function updatePlayerOrder(
  gameId: number,
  positions: Array<{ playerId: number; position: number }>,
): Promise<void> {
  return apiClient.post(UPDATE_PLAYER_ORDER_ENDPOINT(gameId), { positions });
}
