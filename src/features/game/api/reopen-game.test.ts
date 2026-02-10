import { beforeEach, describe, expect, it, vi } from "vitest";
import { reopenGame } from "./reopen-game";

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api";

describe("game/reopen api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls PATCH /game/{id}/reopen", async () => {
    const response = {
      id: 77,
      status: "started",
      currentRound: 4,
      activePlayerId: 2,
      currentThrowCount: 0,
      players: [],
      winnerId: null,
      settings: {
        startScore: 301,
        doubleOut: false,
        tripleOut: false,
      },
    };
    vi.mocked(apiClient.patch).mockResolvedValueOnce(response);

    const result = await reopenGame(77);

    expect(apiClient.patch).toHaveBeenCalledWith("/game/77/reopen");
    expect(result).toEqual(response);
  });
});
