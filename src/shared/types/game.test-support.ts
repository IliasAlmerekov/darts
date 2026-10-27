import type { FinishedPlayerResponse, GameSettingsResponse } from "./api";
import type { FinishedGameProps, GameThrowsResponse, WinnerPlayerProps } from "./game";
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
    isGuest: false,
    position: 0,
    placement: null,
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
    gameId: 1,
    status: "lobby",
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
    settings: { startScore: 501, doubleOut: false, tripleOut: false },
    ...overrides,
  };
}

/**
 * Four finished players in finishing order. Cara has no recorded rounds, which is what the
 * API normalizer produces when the backend sends `roundsPlayed: null`.
 */
export function buildFinishedPlayerResponses(): FinishedPlayerResponse[] {
  return [
    {
      playerId: 1,
      username: "Alice",
      position: 0,
      placement: 1,
      roundsPlayed: 5,
      roundAverage: 60.5,
    },
    { playerId: 2, username: "Bob", position: 1, placement: 2, roundsPlayed: 6, roundAverage: 50 },
    { playerId: 3, username: "Cara", position: 2, placement: 3, roundsPlayed: 0, roundAverage: 0 },
    {
      playerId: 4,
      username: "Dan",
      position: 3,
      placement: 4,
      roundsPlayed: 7,
      roundAverage: 40.25,
    },
  ];
}

/** The standings entries the summary and detail pages show for `buildFinishedPlayerResponses()`. */
export function buildExpectedStandings(): WinnerPlayerProps[] {
  return [
    {
      id: 1,
      name: "Alice",
      score: 0,
      isActive: false,
      index: 0,
      rounds: [{}, {}, {}, {}, {}],
      scoreAverage: 60.5,
      roundCount: 5,
    },
    {
      id: 2,
      name: "Bob",
      score: 0,
      isActive: false,
      index: 1,
      rounds: [{}, {}, {}, {}, {}, {}],
      scoreAverage: 50,
      roundCount: 6,
    },
    {
      id: 3,
      name: "Cara",
      score: 0,
      isActive: false,
      index: 2,
      rounds: [{}],
      scoreAverage: 0,
      roundCount: 0,
    },
    {
      id: 4,
      name: "Dan",
      score: 0,
      isActive: false,
      index: 3,
      rounds: [{}, {}, {}, {}, {}, {}, {}],
      scoreAverage: 40.25,
      roundCount: 7,
    },
  ];
}

/** The empty third podium slot shown when a game had only two players. */
export function buildExpectedPodiumPlaceholder(): WinnerPlayerProps {
  return { id: 0, name: "-", score: 0, isActive: false, index: 0, rounds: [{}] };
}
