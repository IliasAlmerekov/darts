import type { GameSettingsResponse, GameThrowsResponse } from "./api";
import type { FinishedGameProps } from "./game";
import type { BackendPlayer } from "./player";

export function buildFinishedGame(overrides: Partial<FinishedGameProps> = {}): FinishedGameProps {
  return {
    id: 1,
    winnerRounds: 12,
    winnerName: "Alice",
    playersCount: 4,
    date: "2024-01-15T00:00:00Z",
    ...overrides,
  };
}

export function buildBackendPlayer(overrides: Partial<BackendPlayer> = {}): BackendPlayer {
  return {
    id: 1,
    name: "Player 1",
    score: 501,
    isActive: false,
    isBust: false,
    position: 0,
    throwsInCurrentRound: 0,
    currentRoundThrows: [],
    roundHistory: [],
    ...overrides,
  };
}

export function buildGameSettingsResponse(
  overrides: Partial<GameSettingsResponse> = {},
): GameSettingsResponse {
  return {
    startScore: 501,
    doubleOut: false,
    tripleOut: false,
    ...overrides,
  };
}

export function buildGameThrowsResponse(
  overrides: Partial<GameThrowsResponse> = {},
): GameThrowsResponse {
  return {
    type: "full-state",
    id: 1,
    status: "started",
    currentRound: 1,
    activePlayerId: 1,
    currentThrowCount: 0,
    players: [],
    winnerId: null,
    settings: buildGameSettingsResponse(),
    ...overrides,
  };
}
