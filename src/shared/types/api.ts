import type { GameStatus, GameThrowsResponse, ScoreboardDelta } from "./game";

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

export type GameSummaryResponse = FinishedPlayerResponse[];

export interface RematchGameResponse {
  success: boolean;
  gameId: number;
  invitationLink?: string;
}

export interface RematchResponse extends RematchGameResponse {
  invitationLink: string;
}

export interface StartRematchResponse extends RematchGameResponse {
  settings: GameSettingsResponse;
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

export interface UndoAckResponse {
  success: boolean;
  gameId: number;
  stateVersion: string;
  scoreboardDelta: ScoreboardDelta;
  serverTs: string;
}

export type UndoThrowResponse = GameThrowsResponse | UndoAckResponse;

export interface RoomStreamEvent<T = unknown> {
  type: string;
  data: T;
}
