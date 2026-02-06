import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoom, getInvitation } from "./create-room";

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

    expect(apiClient.post).toHaveBeenCalledWith("/invite/create/520");
    expect(response.gameId).toBe(520);
  });

  it("creates room and then requests invitation via POST", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ gameId: 520 })
      .mockResolvedValueOnce({
        gameId: 520,
        invitationLink: "/invite/520",
      });

    const response = await createRoom();

    expect(apiClient.post).toHaveBeenNthCalledWith(1, "/room/create", {});
    expect(apiClient.post).toHaveBeenNthCalledWith(2, "/invite/create/520");
    expect(response).toEqual({
      gameId: 520,
      invitationLink: "/invite/520",
    });
  });
});
