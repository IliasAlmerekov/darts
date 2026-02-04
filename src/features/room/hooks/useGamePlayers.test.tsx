// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/features/game/api", () => ({
  getGameThrows: vi.fn(),
}));

import { getGameThrows } from "@/features/game/api";

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
    vi.mocked(getGameThrows).mockResolvedValue({
      players: [{ id: 1, name: "Player 1", position: 0 }],
    });

    render(<HookConsumer gameId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1");
    });

    sseHandler?.(
      new MessageEvent("players", {
        data: JSON.stringify({ players: [] }),
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });
  });
});
