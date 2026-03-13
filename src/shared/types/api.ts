import type {
  GameStatus,
  GameThrowsResponse as BaseGameThrowsResponse,
  ScoreboardDelta,
} from "./game";

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

export interface AddGuestPayload {
  username: string;
}

export interface GuestPlayer {
  id: number;
  name: string;
  position?: number | null;
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

export interface GameSettingsResponse {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
}

export type GameThrowsResponse = BaseGameThrowsResponse & {
  type: "full-state";
};

export interface UndoAckResponse {
  type: "ack";
  success: boolean;
  gameId: number;
  stateVersion: string;
  scoreboardDelta: ScoreboardDelta;
  serverTs: string;
}

export type UndoThrowResponse = GameThrowsResponse | UndoAckResponse;

export type RoomStreamEventType =
  | "player-joined"
  | "player-left"
  | "game-started"
  | "throw"
  | "throw-recorded"
  | "game-finished";

export interface RoomStreamEvent<T = unknown> {
  type: RoomStreamEventType;
  data: T;
}
