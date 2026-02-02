import { apiClient, API_ENDPOINTS } from "@/lib/api";
import type { CreateRoomResponse, StartGameRequest, ThrowRequest } from "@/types";

export type CreateGamePayload = {
  previousGameId?: number;
  playerIds?: number[];
};

export const handleCreateGame = async (payload?: CreateGamePayload) => {
  const body =
    payload && (payload.previousGameId || (payload.playerIds && payload.playerIds.length > 0))
      ? payload
      : {};

  const room = await apiClient.post<{ gameId: number }>(API_ENDPOINTS.CREATE_ROOM, body);
  const invite = await apiClient.get<CreateRoomResponse>(API_ENDPOINTS.CREATE_INVITE(room.gameId));

  return {
    gameId: invite.gameId,
    invitationLink: invite.invitationLink,
  };
};

export const createRoom = async (payload?: CreateGamePayload): Promise<CreateRoomResponse> => {
  return handleCreateGame(payload);
};

export const getInvitation = async (gameId: number): Promise<CreateRoomResponse> => {
  return apiClient.get<CreateRoomResponse>(API_ENDPOINTS.CREATE_INVITE(gameId));
};

export const getGamePlayers = async (gameId: number) => {
  return apiClient.get(API_ENDPOINTS.LEAVE_ROOM(gameId));
};

export const deletePlayerFromGame = async (gameId: number, playerId: number) => {
  return apiClient.delete(API_ENDPOINTS.LEAVE_ROOM(gameId), { query: { playerId } });
};

export const leaveRoom = async (gameId: number, playerId: number): Promise<void> => {
  return apiClient.delete(API_ENDPOINTS.LEAVE_ROOM(gameId), { query: { playerId } });
};

export const updatePlayerOrder = async (
  gameId: number,
  positions: Array<{ playerId: number; position: number }>,
): Promise<void> => {
  return apiClient.post(API_ENDPOINTS.UPDATE_PLAYER_ORDER(gameId), { positions });
};

export async function createRematch(previousGameId: number): Promise<BASIC.RematchResponse> {
  const rematch = await apiClient.post<
    BASIC.RematchResponse | { gameId: number; invitationLink?: string; success?: boolean }
  >(API_ENDPOINTS.REMATCH(previousGameId));

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

export async function startGame(gameId: number, config: StartGameRequest) {
  return apiClient.post(API_ENDPOINTS.START_GAME(gameId), {
    status: config.status,
    round: config.round,
    startscore: config.startScore,
    doubleout: config.doubleOut,
    tripleout: config.tripleOut,
  });
}

/**
 * Records a throw and returns the complete updated game state.
 * No need for a separate GET request after this - the response contains full GameThrowsResponse.
 */
export async function recordThrow(
  gameId: number,
  payload: ThrowRequest,
): Promise<GameThrowsResponse> {
  return apiClient.post<GameThrowsResponse>(API_ENDPOINTS.RECORD_THROW(gameId), payload);
}

/**
 * Undoes the last throw and returns the complete updated game state.
 * No need for a separate GET request after this - the response contains full GameThrowsResponse.
 */
export async function undoLastThrow(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.delete<GameThrowsResponse>(API_ENDPOINTS.UNDO_THROW(gameId));
}

export type FinishedPlayerResponse = {
  playerId: number;
  username: string;
  position: number;
  roundsPlayed: number;
  roundAverage: number;
};

export async function getFinishedGame(gameId: number): Promise<FinishedPlayerResponse[]> {
  return apiClient.get(API_ENDPOINTS.FINISH_GAME(gameId));
}

export async function abortGame(gameId: number): Promise<{ message: string }> {
  return apiClient.patch(API_ENDPOINTS.ABORT_GAME(gameId));
}

export async function getPlayerStats(
  limit: number = 10,
  offset: number = 0,
  sort: string = "average:desc",
) {
  return apiClient.get(API_ENDPOINTS.PLAYER_STATS, { query: { limit, offset, sort } });
}

export async function getGamesOverview(
  limit: number = 9,
  offset: number = 0,
  sort: string = "average:desc",
) {
  return apiClient.get(API_ENDPOINTS.GAMES_OVERVIEW, { query: { limit, offset, sort } });
}

export type PlayerThrow = {
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
  isBust?: boolean;
};

export type RoundHistory = {
  throws: PlayerThrow[];
};

export type GameThrowsResponse = {
  id: number;
  status: string;
  currentRound: number;
  activePlayerId: number;
  currentThrowCount: number;
  players: {
    id: number;
    name: string;
    score: number;
    isActive: boolean;
    isBust: boolean;
    position: number;
    throwsInCurrentRound: number;
    currentRoundThrows: PlayerThrow[];
    roundHistory: RoundHistory[];
  }[];
  winnerId: number | null;
  settings: {
    startScore: number;
    doubleOut: boolean;
    tripleOut: boolean;
  };
};

export async function getGameThrows(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.get(API_ENDPOINTS.GET_GAME(gameId));
}

type UpdateGameSettingsPayload = Partial<{
  doubleOut: boolean;
  tripleOut: boolean;
}>;

export type CreateGameSettingsPayload = {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
};

export async function createGameSettings(
  payload: CreateGameSettingsPayload,
): Promise<GameThrowsResponse> {
  return apiClient.post(API_ENDPOINTS.CREATE_GAME_SETTINGS, payload);
}

export async function updateGameSettings(
  gameId: number,
  payload: UpdateGameSettingsPayload,
): Promise<GameThrowsResponse> {
  return apiClient.patch(API_ENDPOINTS.GAME_SETTINGS(gameId), payload);
}

export async function saveGameSettings(
  payload: CreateGameSettingsPayload,
  gameId?: number | null,
): Promise<GameThrowsResponse> {
  if (gameId) {
    return updateGameSettings(gameId, payload);
  }
  return createGameSettings(payload);
}
