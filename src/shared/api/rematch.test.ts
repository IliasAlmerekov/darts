// @vitest-environment node
vi.mock("@/shared/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRematch, createRematchGame, startRematch } from "./game";

import { apiClient } from "./client";

describe("game/rematch api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the minimal rematch payload without hydrating invitation data", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ gameId: 777, success: true });

    const response = await createRematchGame(520);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/room/520/rematch",
      undefined,
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(response).toEqual({
      success: true,
      gameId: 777,
    });
  });

  it("requests invitation via POST when rematch response has no invitationLink", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ gameId: 777, success: true })
      .mockResolvedValueOnce({ gameId: 777, invitationLink: "/invite/777" });

    const response = await createRematch(520);

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/room/520/rematch",
      undefined,
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/invite/create/777",
      undefined,
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(response).toEqual({
      success: true,
      gameId: 777,
      invitationLink: "/invite/777",
    });
  });

  it("starts rematch with canonical settings and returns the new game id", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ gameId: 777, success: true })
      .mockResolvedValueOnce(undefined);

    const response = await startRematch(520);

    expect(apiClient.get).toHaveBeenCalledWith(
      "/game/520/settings",
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/room/520/rematch",
      undefined,
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/game/777/start",
      {
        startscore: 501,
        doubleout: true,
        tripleout: false,
      },
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(response).toEqual({
      success: true,
      gameId: 777,
      settings: {
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      },
    });
  });
});
