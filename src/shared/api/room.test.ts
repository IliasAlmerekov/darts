// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoom, getInvitation } from "./room";

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

import { apiClient } from "./client";

describe("room/create-room api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses POST for invitation endpoint", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      gameId: 520,
      invitationLink: "/invite/520",
    });

    const response = await getInvitation(520);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/invite/create/520",
      undefined,
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(response.gameId).toBe(520);
  });

  it("forwards AbortSignal for invitation requests", async () => {
    const controller = new AbortController();
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      gameId: 520,
      invitationLink: "/invite/520",
    });

    await getInvitation(520, controller.signal);

    expect(apiClient.post).toHaveBeenCalledWith("/invite/create/520", undefined, {
      signal: controller.signal,
      validate: expect.any(Function),
    });
  });

  it("creates room and then requests invitation via POST", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ success: true, gameId: 520 })
      .mockResolvedValueOnce({
        gameId: 520,
        invitationLink: "/invite/520",
      });

    const response = await createRoom();

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/room/create",
      {},
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/invite/create/520",
      undefined,
      expect.objectContaining({ validate: expect.any(Function) }),
    );
    expect(response).toEqual({
      gameId: 520,
      invitationLink: "/invite/520",
    });
  });

  it("forwards pre-create settings when creating a room", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ success: true, gameId: 520 })
      .mockResolvedValueOnce({
        gameId: 520,
        invitationLink: "/invite/520",
      });

    await createRoom({
      previousGameId: 77,
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/room/create",
      {
        previousGameId: 77,
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      },
      expect.objectContaining({ validate: expect.any(Function) }),
    );
  });
});
