import { apiClient } from "@/lib/api";
import type { CreateRoomResponse } from "@/types";

const CREATE_ROOM_ENDPOINT = "/room/create";
const CREATE_INVITE_ENDPOINT = (id: number) => `/invite/create/${id}`;

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
export async function handleCreateGame(payload?: CreateGamePayload) {
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
 * Creates a new room using optional payload.
 */
export async function createRoom(payload?: CreateGamePayload): Promise<CreateRoomResponse> {
  return handleCreateGame(payload);
}
