import type { GameStatus } from "./game";

export interface PaginatedRequest {
  [key: string]: string | number | boolean | null | undefined;
  limit?: number;
  offset?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface CreateRoomResponse {
  gameId: number;
  invitationLink: string;
}

export interface StartGameRequest {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
  round?: number;
  status?: GameStatus;
}

export interface ThrowRequest {
  playerId: number;
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
  isBust?: boolean;
}

export interface FinishedPlayerResponse {
  playerId: number;
  username: string;
  position: number;
  roundsPlayed: number;
  roundAverage: number;
}

export interface RematchResponse {
  success: boolean;
  gameId: number;
  invitationLink: string;
}

export type AddGuestPayload = {
  username: string;
};

export type GuestPlayer = {
  id: number;
  name: string;
  position?: number | null;
};

export type AddGuestErrorResponse = {
  success: false;
  error: "USERNAME_TAKEN";
  message: string;
  suggestions?: string[];
};

export type CreateGameSettingsPayload = {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
};

export interface GameSettingsResponse {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
}

export interface RoomStreamEvent<T = unknown> {
  type: string;
  data: T;
}
