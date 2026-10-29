import type { GameSettingsResponse } from "@/shared/api/game";
import type { GameStatus } from "./game";

export type { GameSettingsResponse, UndoAckResponse } from "@/shared/api/game";

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
  placement: number | null;
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

export interface AddGuestPayload {
  username: string;
}

export interface AddGuestErrorResponse {
  success: false;
  error: "USERNAME_TAKEN";
  message: string;
  suggestions?: string[];
}

export interface CreateGameSettingsPayload {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
}

export type UpdateGameSettingsPayload = Partial<CreateGameSettingsPayload>;
