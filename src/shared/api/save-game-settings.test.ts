// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveGameSettings } from "./game";
import { apiClient } from "./client";

describe("saveGameSettings", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when gameId is missing instead of creating server state implicitly", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      id: 999,
      players: [],
      status: "lobby",
    });
    const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValueOnce({
      id: 999,
      players: [],
      status: "lobby",
    });

    await expect(
      saveGameSettings(
        {
          startScore: 301,
          doubleOut: false,
          tripleOut: false,
        },
        null,
      ),
    ).rejects.toThrow(/game.?id/i);

    expect(postSpy).not.toHaveBeenCalled();
    expect(patchSpy).not.toHaveBeenCalled();
  });
});
