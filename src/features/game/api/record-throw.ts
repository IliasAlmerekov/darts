import { apiClient } from "@/lib/api";
import type { ThrowRequest } from "@/types";

const RECORD_THROW_ENDPOINT = (id: number) => `/game/${id}/throw`;

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

/**
 * Records a throw and returns the complete updated game state.
 * No need for a separate GET request after this - the response contains full GameThrowsResponse.
 */
export async function recordThrow(
  gameId: number,
  payload: ThrowRequest,
): Promise<GameThrowsResponse> {
  return apiClient.post<GameThrowsResponse>(RECORD_THROW_ENDPOINT(gameId), payload);
}
