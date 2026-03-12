// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGamePlayers } from "./useGamePlayers";

let sseHandler: ((event: MessageEvent<string>) => void) | null = null;

vi.mock("@/shared/hooks/useEventSource", () => ({
  useEventSource: (
    _url: string | null,
    listeners: ReadonlyArray<{ handler: (event: MessageEvent<string>) => void }>,
  ) => {
    sseHandler = listeners[0]?.handler ?? null;
    return { error: null, isConnected: false };
  },
}));

vi.mock("@/shared/api/game", () => ({
  getGameThrows: vi.fn(),
}));

vi.mock("@/shared/lib/clientLogger", () => ({
  clientLogger: {
    error: vi.fn(),
  },
}));

vi.mock("@/shared/store", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    $gameData: { get: vi.fn() },
  };
});

import { getGameThrows } from "@/shared/api/game";
import { clientLogger } from "@/shared/lib/clientLogger";
import type { GameThrowsResponse } from "@/types";

const buildGameThrowsResponse = (
  overrides: Partial<GameThrowsResponse> = {},
): GameThrowsResponse => ({
  type: "full-state",
  id: 1,
  status: "started",
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
    vi.mocked(clientLogger.error).mockReset();
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

  it("logs fetch failures through clientLogger", async () => {
    const error = new Error("fetch failed");
    vi.mocked(getGameThrows).mockRejectedValue(error);

    render(<HookConsumer gameId={42} />);

    await waitFor(() => {
      expect(clientLogger.error).toHaveBeenCalledWith("room.players.fetch.failed", {
        context: { gameId: 42 },
        error,
      });
    });
  });

  it("logs malformed SSE payloads through clientLogger without crashing the stream", async () => {
    vi.mocked(getGameThrows).mockResolvedValue(buildGameThrowsResponse());

    render(<HookConsumer gameId={7} />);

    act(() => {
      sseHandler?.(
        new MessageEvent("players", {
          data: "{invalid-json",
        }),
      );
    });

    await waitFor(() => {
      expect(clientLogger.error).toHaveBeenCalledWith("room.players.sse-parse.failed", {
        context: { raw: "{invalid-json" },
        error: expect.objectContaining({
          message: expect.any(String),
        }),
      });
    });

    act(() => {
      sseHandler?.(
        new MessageEvent("players", {
          data: JSON.stringify({
            players: [{ id: 1, username: "Player 1", position: 0 }],
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
  });
});
