import { apiClient, API_BASE_URL } from "@/lib/api";
import { ApiError, ForbiddenError, NetworkError, UnauthorizedError } from "@/lib/api/errors";
import type {
  CreateRoomResponse,
  GameThrowsResponse,
  StartGameRequest,
  ThrowRequest,
} from "@/types";

export type { GameThrowsResponse };

const START_GAME_ENDPOINT = (id: number) => `/game/${id}/start`;
const GET_GAME_ENDPOINT = (id: number) => `/game/${id}`;
const CREATE_GAME_SETTINGS_ENDPOINT = "/game/settings";
const GAME_SETTINGS_ENDPOINT = (id: number) => `/game/${id}/settings`;
const FINISHED_GAME_ENDPOINT = (id: number) => `/game/${id}/finished`;
const REMATCH_ENDPOINT = (id: number) => `/room/${id}/rematch`;
const CREATE_INVITE_ENDPOINT = (id: number) => `/invite/create/${id}`;
const REOPEN_GAME_ENDPOINT = (id: number) => `/game/${id}/reopen`;
const UNDO_THROW_ENDPOINT = (id: number) => `/game/${id}/throw`;
const RECORD_THROW_ENDPOINT = (id: number) => `/game/${id}/throw`;

export type CreateGameSettingsPayload = {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
};

type UpdateGameSettingsPayload = Partial<{
  doubleOut: boolean;
  tripleOut: boolean;
}>;

export type FinishedPlayerResponse = {
  playerId: number;
  username: string;
  position: number;
  roundsPlayed: number;
  roundAverage: number;
};

const gameStateVersionById = new Map<number, string>();

type ParsedResponse = unknown;

function buildConditionalGameUrl(gameId: number, stateVersion: string | null): string {
  const endpoint = GET_GAME_ENDPOINT(gameId);
  if (!stateVersion) return `${API_BASE_URL}${endpoint}`;

  const encodedVersion = encodeURIComponent(stateVersion);
  return `${API_BASE_URL}${endpoint}?since=${encodedVersion}`;
}

async function parseResponseBody(response: Response): Promise<ParsedResponse> {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (isJson) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
}

function getNextStateVersion(response: Response): string | null {
  return response.headers.get("X-Game-State-Version") ?? response.headers.get("ETag");
}

export async function startGame(gameId: number, config: StartGameRequest): Promise<void> {
  await apiClient.post(START_GAME_ENDPOINT(gameId), {
    status: config.status,
    round: config.round,
    startscore: config.startScore,
    doubleout: config.doubleOut,
    tripleout: config.tripleOut,
  });
}

export async function getGameThrows(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.get(GET_GAME_ENDPOINT(gameId));
}

export async function getGameThrowsIfChanged(gameId: number): Promise<GameThrowsResponse | null> {
  const currentVersion = gameStateVersionById.get(gameId) ?? null;
  const requestUrl = buildConditionalGameUrl(gameId, currentVersion);

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(currentVersion ? { "If-None-Match": currentVersion } : {}),
      },
    });
  } catch (error) {
    throw new NetworkError("Network request failed", error);
  }

  if (response.status === 304) {
    return null;
  }

  const data = await parseResponseBody(response);

  if (response.status === 401) {
    window.location.href = "/";
    throw new UnauthorizedError("Unauthorized", data, response.url);
  }

  if (response.status === 403) {
    throw new ForbiddenError("Access denied", data, response.url);
  }

  if (!response.ok) {
    throw new ApiError("Request failed", {
      status: response.status,
      data,
      url: response.url,
    });
  }

  const nextVersion = getNextStateVersion(response);
  if (nextVersion) {
    gameStateVersionById.set(gameId, nextVersion);
  }

  return data as GameThrowsResponse;
}

export function resetGameStateVersion(gameId?: number): void {
  if (typeof gameId === "number") {
    gameStateVersionById.delete(gameId);
    return;
  }

  gameStateVersionById.clear();
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

async function createGameSettings(payload: CreateGameSettingsPayload): Promise<GameThrowsResponse> {
  return apiClient.post(CREATE_GAME_SETTINGS_ENDPOINT, payload);
}

async function updateGameSettings(
  gameId: number,
  payload: UpdateGameSettingsPayload,
): Promise<GameThrowsResponse> {
  return apiClient.patch(GAME_SETTINGS_ENDPOINT(gameId), payload);
}

export async function getFinishedGame(gameId: number): Promise<FinishedPlayerResponse[]> {
  return apiClient.get(FINISHED_GAME_ENDPOINT(gameId));
}

async function getInvitation(gameId: number): Promise<CreateRoomResponse> {
  return apiClient.post<CreateRoomResponse>(CREATE_INVITE_ENDPOINT(gameId));
}

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

export async function reopenGame(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.patch<GameThrowsResponse>(REOPEN_GAME_ENDPOINT(gameId));
}

export async function undoLastThrow(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.delete<GameThrowsResponse>(UNDO_THROW_ENDPOINT(gameId));
}

export async function recordThrow(
  gameId: number,
  payload: ThrowRequest,
): Promise<GameThrowsResponse> {
  return apiClient.post<GameThrowsResponse>(RECORD_THROW_ENDPOINT(gameId), payload);
}
