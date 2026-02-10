// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGamePlayers } from "./useGamePlayers";

let sseHandler: ((event: MessageEvent<string>) => void) | null = null;

vi.mock("@/hooks/useEventSource", () => ({
  useEventSource: (
    _url: string | null,
    _eventName: string,
    handler: (event: MessageEvent<string>) => void,
  ) => {
    sseHandler = handler;
  },
}));

vi.mock("@/lib/api/game", () => ({
  getGameThrows: vi.fn(),
}));

import { getGameThrows, type GameThrowsResponse } from "@/lib/api/game";

const buildGameThrowsResponse = (
  overrides: Partial<GameThrowsResponse> = {},
): GameThrowsResponse => ({
  id: 1,
  status: "active",
  currentRound: 1,
  activePlayerId: 1,
  currentThrowCount: 0,
  players: [],
  winnerId: null,
  settings: {
    startScore: 501,
    doubleOut: false,
    tripleOut: false,
  },
  ...overrides,
});

function HookConsumer({ gameId }: { gameId: number | null }) {
  const { count } = useGamePlayers(gameId);
  return <div data-testid="count">{count}</div>;
}

describe("useGamePlayers", () => {
  beforeEach(() => {
    sseHandler = null;
    vi.mocked(getGameThrows).mockReset();
  });

  it("clears players when SSE sends an empty list", async () => {
    vi.mocked(getGameThrows).mockResolvedValue(
      buildGameThrowsResponse({
        players: [
          {
            id: 1,
            name: "Player 1",
            score: 501,
            isActive: true,
            isBust: false,
            position: 0,
            throwsInCurrentRound: 0,
            currentRoundThrows: [],
            roundHistory: [],
          },
        ],
      }),
    );

    render(<HookConsumer gameId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });

    act(() => {
      sseHandler?.(
        new MessageEvent("players", {
          data: JSON.stringify({ players: [] }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
    });
  });

  it("does not fetch players when game id is missing", async () => {
    render(<HookConsumer gameId={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
    });

    expect(getGameThrows).not.toHaveBeenCalled();
  });
});
