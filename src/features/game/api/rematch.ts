import { apiClient } from "@/lib/api";
import type { CreateRoomResponse } from "@/types";

const REMATCH_ENDPOINT = (id: number) => `/room/${id}/rematch`;
const CREATE_INVITE_ENDPOINT = (id: number) => `/invite/create/${id}`;

async function getInvitation(gameId: number): Promise<CreateRoomResponse> {
  return apiClient.post<CreateRoomResponse>(CREATE_INVITE_ENDPOINT(gameId));
}

/**
 * Creates a rematch and returns invitation details for the new game.
 */
export async function createRematch(previousGameId: number): Promise<BASIC.RematchResponse> {
  const rematch = await apiClient.post<
    BASIC.RematchResponse | { gameId: number; invitationLink?: string; success?: boolean }
  >(REMATCH_ENDPOINT(previousGameId));

  if ("invitationLink" in rematch && rematch.invitationLink) {
    return {
      success: "success" in rematch ? !!rematch.success : true,
      gameId: rematch.gameId,
      invitationLink: rematch.invitationLink,
    };
  }

  const invite = await getInvitation(rematch.gameId);
  return {
    success: "success" in rematch ? !!rematch.success : true,
    gameId: invite.gameId,
    invitationLink: invite.invitationLink,
  };
}
