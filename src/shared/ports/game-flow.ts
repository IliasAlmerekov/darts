import type {
  CreateGameSettingsPayload,
  FinishedPlayerResponse,
  GameThrowsResponse,
} from "@/lib/api/game";
import {
  createRematch,
  getFinishedGame,
  getGameThrows,
  reopenGame,
  saveGameSettings,
  startGame,
  undoLastThrow,
} from "@/lib/api/game";
import type {
  AddGuestErrorResponse,
  AddGuestPayload,
  CreateGamePayload,
  GuestPlayer,
} from "@/lib/api/room";
import {
  addGuestPlayer,
  createRoom,
  getInvitation,
  leaveRoom,
  updatePlayerOrder,
} from "@/lib/api/room";
import type { CreateRoomResponse, StartGameRequest } from "@/types";

export type { AddGuestErrorResponse };

export interface GameFlowPort {
  getGameThrows: (gameId: number) => Promise<GameThrowsResponse>;
  startGame: (gameId: number, config: StartGameRequest) => Promise<void>;
  saveGameSettings: (
    payload: CreateGameSettingsPayload,
    gameId?: number | null,
  ) => Promise<GameThrowsResponse>;
  createRoom: (payload?: CreateGamePayload) => Promise<CreateRoomResponse>;
  getInvitation: (gameId: number) => Promise<CreateRoomResponse>;
  leaveRoom: (gameId: number, playerId?: number) => Promise<void>;
  updatePlayerOrder: (
    gameId: number,
    positions: Array<{ playerId: number; position: number }>,
  ) => Promise<void>;
  addGuestPlayer: (gameId: number, payload: AddGuestPayload) => Promise<GuestPlayer>;
  getFinishedGame: (gameId: number) => Promise<FinishedPlayerResponse[]>;
  createRematch: (previousGameId: number) => Promise<BASIC.RematchResponse>;
  reopenGame: (gameId: number) => Promise<GameThrowsResponse>;
  undoLastThrow: (gameId: number) => Promise<GameThrowsResponse>;
}

export const defaultGameFlowPort: GameFlowPort = {
  getGameThrows,
  startGame,
  saveGameSettings,
  createRoom,
  getInvitation,
  leaveRoom,
  updatePlayerOrder,
  addGuestPlayer,
  getFinishedGame,
  createRematch,
  reopenGame,
  undoLastThrow,
};
