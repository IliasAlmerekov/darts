// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameDetailPage } from "./useGameDetailPage";

const getFinishedGameMock = vi.fn();
let routeId = "42";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: routeId }),
}));

vi.mock("@/shared/providers/GameFlowPortProvider", () => ({
  useGameFlowPort: () => ({
    getFinishedGame: (...args: unknown[]) => getFinishedGameMock(...args),
  }),
}));

describe("useGameDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeId = "42";
  });

  it("loads finished game data by id from route params", async () => {
    getFinishedGameMock.mockResolvedValue([
      {
        playerId: 1,
        username: "Alice",
        position: 1,
        roundsPlayed: 4,
        roundAverage: 75,
      },
      {
        playerId: 2,
        username: "Bob",
        position: 2,
        roundsPlayed: 4,
        roundAverage: 65,
      },
    ]);

    const { result } = renderHook(() => useGameDetailPage());

    await waitFor(() => {
      expect(getFinishedGameMock).toHaveBeenCalledWith(42);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.newList).toHaveLength(2);
    expect(result.current.podiumData).toHaveLength(3);
  });

  it("returns an error and skips loading when route id is invalid", async () => {
    routeId = "invalid-id";

    const { result } = renderHook(() => useGameDetailPage());

    await waitFor(() => {
      expect(result.current.error).toBe("Invalid game id");
    });

    expect(getFinishedGameMock).not.toHaveBeenCalled();
  });
});
