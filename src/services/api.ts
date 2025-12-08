import { apiClient, API_ENDPOINTS } from "@/shared/api";
import type { StartGameRequest, ThrowRequest } from "@/shared/types";

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
  const invite = await apiClient.get<{ gameId: number; invitationLink: string }>(
    API_ENDPOINTS.CREATE_INVITE(room.gameId),
  );

  return {
    gameId: invite.gameId,
    invitationLink: invite.invitationLink,
  };
};

export const getGamePlayers = async (gameId: number) => {
  return apiClient.get(API_ENDPOINTS.LEAVE_ROOM(gameId));
};

export const deletePlayerFromGame = async (gameId: number, playerId: number) => {
  return apiClient.delete(API_ENDPOINTS.LEAVE_ROOM(gameId), { query: { playerId } });
};

export async function createRematch(previousGameId: number): Promise<BASIC.RematchResponse> {
  return apiClient.post(API_ENDPOINTS.REMATCH(previousGameId));
}

export type GamePlayersWithUserInfoResponse = {
  gameId: number;
  players?: { id: number; username: string }[];
  items?: { id: number; username: string }[];
};

export async function getGamePlayersWithUserInfo(
  gameId: number,
): Promise<GamePlayersWithUserInfoResponse> {
  return apiClient.get<GamePlayersWithUserInfoResponse>(API_ENDPOINTS.GET_GAME_PLAYERS(gameId));
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
export async function recordThrow(gameId: number, payload: ThrowRequest) {
  return apiClient.post(API_ENDPOINTS.RECORD_THROW(gameId), payload);
}

/**
 * Undoes the last throw and returns the complete updated game state.
 * No need for a separate GET request after this - the response contains full GameThrowsResponse.
 */
export async function undoLastThrow(gameId: number) {
  return apiClient.delete(API_ENDPOINTS.UNDO_THROW(gameId));
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
    roundHistory: unknown[];
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
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
}>;

export async function updateGameSettings(
  gameId: number,
  payload: UpdateGameSettingsPayload,
): Promise<GameThrowsResponse["settings"]> {
  const data = await apiClient.patch<{ settings: GameThrowsResponse["settings"] }>(
    API_ENDPOINTS.GAME_SETTINGS(gameId),
    payload,
  );
  return data.settings;
}
