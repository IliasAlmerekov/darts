import type { FinishedGameProps } from "./game";

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
