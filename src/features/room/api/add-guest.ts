import { apiClient } from "@/lib/api";

const ADD_GUEST_ENDPOINT = (id: number) => `/room/${id}/guest`;

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

/**
 * Adds a guest player to a game room.
 */
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
