// @vitest-environment node
vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  apiClient: {
    get: vi.fn(),
  },
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentGame } from "./player";
import { apiClient, ApiValidationError } from "./client";
import { respondWith } from "./test-utils";

// Contract examples: GET /api/player/current-game
const lobbyExample = { gameId: 12, status: "lobby" };
const noneExample = { gameId: null, status: null };

describe("getCurrentGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the player's current game from the lobby example", async () => {
    const controller = new AbortController();
    vi.mocked(apiClient.get).mockImplementationOnce(respondWith(lobbyExample));

    await expect(getCurrentGame(controller.signal)).resolves.toEqual({
      kind: "lobby",
      gameId: 12,
    });
    expect(apiClient.get).toHaveBeenCalledWith("/player/current-game", {
      signal: controller.signal,
      validate: expect.any(Object),
    });
  });

  it("returns no game when the player has no current game", async () => {
    vi.mocked(apiClient.get).mockImplementationOnce(respondWith(noneExample));

    await expect(getCurrentGame()).resolves.toEqual({ kind: "none" });
  });

  // The contract makes each field nullable on its own.
  it.each([
    { payload: { gameId: 12, status: null }, expected: { kind: "lobby", gameId: 12 } },
    { payload: { gameId: null, status: "lobby" }, expected: { kind: "none" } },
  ])("accepts a response where only one field is null: $payload", async ({ payload, expected }) => {
    vi.mocked(apiClient.get).mockImplementationOnce(respondWith(payload));

    await expect(getCurrentGame()).resolves.toEqual(expected);
  });

  it("rejects with ApiValidationError for an unknown status", async () => {
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith({ gameId: 12, status: "finished" }),
    );

    await expect(getCurrentGame()).rejects.toBeInstanceOf(ApiValidationError);
  });
});
